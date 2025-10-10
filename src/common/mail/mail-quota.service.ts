import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MailQuotaStatsEntity,
  MailSendLogEntity,
} from './entities/mail-stats.entity';
import { MailConfig } from './mail.config';

export interface QuotaStatus {
  provider: 'qq' | '163' | 'total';
  sentCount: number;
  quotaLimit: number;
  usagePercent: number;
  remaining: number;
  status: 'normal' | 'warning' | 'strict' | 'exhausted';
}

@Injectable()
export class MailQuotaService {
  private readonly logger = new Logger(MailQuotaService.name);

  constructor(
    @InjectRepository(MailQuotaStatsEntity)
    private quotaStatsRepository: Repository<MailQuotaStatsEntity>,
    @InjectRepository(MailSendLogEntity)
    private sendLogRepository: Repository<MailSendLogEntity>,
    private mailConfig: MailConfig,
  ) {}

  /**
   * 获取今天的配额统计
   */
  async getTodayQuota(provider: 'qq' | '163' | 'total'): Promise<QuotaStatus> {
    const today = new Date().toISOString().split('T')[0]; // '2025-10-10' 格式

    // 先尝试查询,使用字符串格式日期匹配 MySQL DATE 类型
    let stats = await this.quotaStatsRepository.findOne({
      where: { provider, statDate: today as any },
    });

    // 如果没有记录,使用 INSERT IGNORE 来避免并发冲突
    if (!stats) {
      const quotaLimit = this.getQuotaLimit(provider);

      try {
        // 使用原生 SQL: INSERT IGNORE,使用字符串格式日期
        await this.quotaStatsRepository.query(
          `INSERT IGNORE INTO mail_quota_stats (provider, stat_date, sent_count, failed_count, quota_limit) VALUES (?, ?, ?, ?, ?)`,
          [provider, today, 0, 0, quotaLimit],
        );

        // 插入后重新查询,如果没找到等待 50ms 后再试一次(处理并发情况)
        stats = await this.quotaStatsRepository.findOne({
          where: { provider, statDate: today as any },
        });

        if (!stats) {
          // 等待 50ms,让其他并发的 INSERT IGNORE 完成
          await new Promise((resolve) => setTimeout(resolve, 50));
          stats = await this.quotaStatsRepository.findOne({
            where: { provider, statDate: today as any },
          });
        }

        if (stats) {
          this.logger.debug(`创建或查询配额记录成功: ${provider} - ${today}`);
        } else {
          throw new Error(
            `INSERT IGNORE 后仍无法查询到记录: ${provider} - ${today}`,
          );
        }
      } catch (error: any) {
        this.logger.error(`创建配额记录失败: ${provider} - ${today}`, error);
        throw error;
      }
    }

    return this.calculateQuotaStatus(stats);
  }

  /**
   * 检查是否可以发送邮件
   */
  async canSendMail(provider: 'qq' | '163'): Promise<{
    allowed: boolean;
    reason?: string;
    quotaStatus: QuotaStatus;
  }> {
    const providerQuota = await this.getTodayQuota(provider);
    const totalQuota = await this.getTodayQuota('total');

    // 检查单个提供商配额
    if (providerQuota.status === 'exhausted') {
      return {
        allowed: false,
        reason: `${provider.toUpperCase()}邮箱今日配额已用完`,
        quotaStatus: providerQuota,
      };
    }

    // 检查总配额
    if (totalQuota.status === 'exhausted') {
      return {
        allowed: false,
        reason: '今日邮件总配额已用完，请明日再试',
        quotaStatus: totalQuota,
      };
    }

    // 严格限制模式（90%以上）
    if (totalQuota.status === 'strict') {
      return {
        allowed: true, // 仍然允许，但应该在调用处进行额外验证
        reason: '邮件配额紧张，仅允许关键操作',
        quotaStatus: totalQuota,
      };
    }

    return {
      allowed: true,
      quotaStatus: providerQuota,
    };
  }

  /**
   * 记录邮件发送
   */
  async recordSent(
    provider: 'qq' | '163',
    recipientEmail: string,
    mailType: 'verification' | 'reset_password' | 'notification',
    status: 'success' | 'failed',
    options?: {
      subject?: string;
      errorMessage?: string;
      retryCount?: number;
      ipAddress?: string;
      responseTime?: number;
    },
  ): Promise<void> {
    // 记录发送日志
    await this.sendLogRepository.save({
      provider,
      recipientEmail,
      mailType,
      status,
      subject: options?.subject,
      errorMessage: options?.errorMessage,
      retryCount: options?.retryCount || 0,
      ipAddress: options?.ipAddress,
      responseTime: options?.responseTime,
    });

    // 更新配额统计
    await this.incrementQuota(
      provider,
      status === 'success' ? 'sent' : 'failed',
    );
    await this.incrementQuota(
      'total',
      status === 'success' ? 'sent' : 'failed',
    );

    // 记录日志
    this.logger.log(
      `邮件发送记录: ${provider} -> ${recipientEmail} [${status}] (${mailType})`,
    );

    // 检查配额告警
    const quota = await this.getTodayQuota('total');
    if (quota.status === 'warning') {
      this.logger.warn(
        `⚠️ 邮件配额警告: 已使用 ${quota.usagePercent}% (${quota.sentCount}/${quota.quotaLimit})`,
      );
    } else if (quota.status === 'strict') {
      this.logger.warn(
        `🔒 邮件配额严格限制: 已使用 ${quota.usagePercent}% (${quota.sentCount}/${quota.quotaLimit})`,
      );
    } else if (quota.status === 'exhausted') {
      this.logger.error(
        `❌ 邮件配额已耗尽: ${quota.sentCount}/${quota.quotaLimit}`,
      );
    }
  }

  /**
   * 获取所有提供商的配额状态
   */
  async getAllQuotaStatus(): Promise<{
    qq: QuotaStatus;
    _163: QuotaStatus;
    total: QuotaStatus;
  }> {
    const [qq, _163, total] = await Promise.all([
      this.getTodayQuota('qq'),
      this.getTodayQuota('163'),
      this.getTodayQuota('total'),
    ]);

    return { qq, _163, total };
  }

  /**
   * 获取发送统计
   */
  async getStats(days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.quotaStatsRepository
      .createQueryBuilder('stats')
      .where('stats.statDate >= :startDate', { startDate })
      .orderBy('stats.statDate', 'DESC')
      .getMany();

    return {
      days,
      stats: stats.map((s) => ({
        provider: s.provider,
        date: s.statDate,
        sent: s.sentCount,
        failed: s.failedCount,
        total: s.sentCount + s.failedCount,
        quotaLimit: s.quotaLimit,
        usagePercent: ((s.sentCount / s.quotaLimit) * 100).toFixed(2),
      })),
    };
  }

  // ==================== 私有方法 ====================

  private getQuotaLimit(provider: 'qq' | '163' | 'total'): number {
    switch (provider) {
      case 'qq':
        return this.mailConfig.qq.dailyLimit;
      case '163':
        return this.mailConfig._163.dailyLimit;
      case 'total':
        return this.mailConfig.totalDailyLimit;
    }
  }

  private calculateQuotaStatus(stats: MailQuotaStatsEntity): QuotaStatus {
    const usagePercent = (stats.sentCount / stats.quotaLimit) * 100;
    const remaining = stats.quotaLimit - stats.sentCount;

    let status: 'normal' | 'warning' | 'strict' | 'exhausted' = 'normal';
    if (usagePercent >= 100) {
      status = 'exhausted';
    } else if (usagePercent >= this.mailConfig.quotaStrictPercent) {
      status = 'strict';
    } else if (usagePercent >= this.mailConfig.quotaWarningPercent) {
      status = 'warning';
    }

    return {
      provider: stats.provider,
      sentCount: stats.sentCount,
      quotaLimit: stats.quotaLimit,
      usagePercent: Math.round(usagePercent * 100) / 100,
      remaining: Math.max(0, remaining),
      status,
    };
  }

  private async incrementQuota(
    provider: 'qq' | '163' | 'total',
    type: 'sent' | 'failed',
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const field = type === 'sent' ? 'sentCount' : 'failedCount';

    // 先确保记录存在(使用getTodayQuota会自动创建)
    await this.getTodayQuota(provider);

    // 然后执行原子更新
    await this.quotaStatsRepository
      .createQueryBuilder()
      .update()
      .set({ [field]: () => `${field} + 1` })
      .where('provider = :provider AND statDate = :statDate', {
        provider,
        statDate: today,
      })
      .execute();
  }

  /**
   * 每天凌晨1点清理过期数据
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanupExpiredData(): Promise<void> {
    this.logger.log('开始清理过期邮件数据...');

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 清理7天前的配额统计
      const deletedStats = await this.quotaStatsRepository.delete({
        statDate: LessThan(sevenDaysAgo),
      });

      // 清理30天前的发送日志
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const deletedLogs = await this.sendLogRepository.delete({
        createdAt: LessThan(thirtyDaysAgo),
      });

      this.logger.log(
        `清理完成: 删除 ${deletedStats.affected || 0} 条配额统计, ${deletedLogs.affected || 0} 条发送日志`,
      );
    } catch (error) {
      this.logger.error('清理过期数据失败:', error);
    }
  }

  /**
   * 每天凌晨0点初始化新一天的配额
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async initializeDailyQuota(): Promise<void> {
    this.logger.log('初始化新一天的邮件配额...');

    try {
      const today = new Date().toISOString().split('T')[0];

      await this.quotaStatsRepository.save([
        {
          provider: 'qq',
          statDate: new Date(today),
          sentCount: 0,
          failedCount: 0,
          quotaLimit: this.mailConfig.qq.dailyLimit,
        },
        {
          provider: '163',
          statDate: new Date(today),
          sentCount: 0,
          failedCount: 0,
          quotaLimit: this.mailConfig._163.dailyLimit,
        },
        {
          provider: 'total',
          statDate: new Date(today),
          sentCount: 0,
          failedCount: 0,
          quotaLimit: this.mailConfig.totalDailyLimit,
        },
      ]);

      this.logger.log('新一天的邮件配额初始化完成');
    } catch (error) {
      this.logger.error('初始化配额失败:', error);
    }
  }
}
