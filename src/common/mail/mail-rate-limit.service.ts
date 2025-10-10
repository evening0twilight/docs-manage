import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { MailRateLimitEntity } from './entities/mail-stats.entity';
import { MailConfig } from './mail.config';

@Injectable()
export class MailRateLimitService {
  private readonly logger = new Logger(MailRateLimitService.name);

  constructor(
    @InjectRepository(MailRateLimitEntity)
    private rateLimitRepository: Repository<MailRateLimitEntity>,
    private mailConfig: MailConfig,
  ) {}

  /**
   * 检查IP每日限制
   */
  async checkIpDailyLimit(ipAddress: string): Promise<{
    allowed: boolean;
    remaining: number;
    reason?: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.getRateLimitRecord(ipAddress, 'ip_daily', today);

    const limit = this.mailConfig.rateLimitIpDaily;
    const count = record ? record.count : 0;
    const remaining = Math.max(0, limit - count);

    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        reason: `IP ${ipAddress} 今日发送次数已达上限（${limit}次）`,
      };
    }

    return { allowed: true, remaining };
  }

  /**
   * 检查邮箱每小时限制
   */
  async checkEmailHourlyLimit(email: string): Promise<{
    allowed: boolean;
    remaining: number;
    reason?: string;
  }> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const record = await this.getRateLimitRecord(
      email,
      'email_hourly',
      oneHourAgo,
    );

    const limit = this.mailConfig.rateLimitEmailHourly;
    const count = record ? record.count : 0;
    const remaining = Math.max(0, limit - count);

    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        reason: `邮箱 ${email} 一小时内接收次数已达上限（${limit}次）`,
      };
    }

    return { allowed: true, remaining };
  }

  /**
   * 检查同一操作间隔时间（60秒冷却）
   */
  async checkSameOperationLimit(
    identifier: string,
    operationType: string,
  ): Promise<{
    allowed: boolean;
    remainingSeconds: number;
    reason?: string;
  }> {
    const cooldownSeconds = this.mailConfig.rateLimitSameOperation;
    const cooldownTime = new Date();
    cooldownTime.setSeconds(cooldownTime.getSeconds() - cooldownSeconds);

    const record = await this.rateLimitRepository.findOne({
      where: {
        identifier,
        limitType: 'same_operation',
        operationType,
        windowStart: MoreThan(cooldownTime),
      },
      order: { windowStart: 'DESC' },
    });

    if (record) {
      const elapsed = Math.floor(
        (Date.now() - record.windowStart.getTime()) / 1000,
      );
      const remaining = cooldownSeconds - elapsed;

      if (remaining > 0) {
        return {
          allowed: false,
          remainingSeconds: remaining,
          reason: `操作过于频繁，请在 ${remaining} 秒后重试`,
        };
      }
    }

    return { allowed: true, remainingSeconds: 0 };
  }

  /**
   * 记录限流
   */
  async recordRateLimit(
    identifier: string,
    limitType: 'ip_daily' | 'email_hourly' | 'same_operation',
    operationType?: string,
  ): Promise<void> {
    const now = new Date();
    let windowStart: Date;
    let expiresAt: Date;

    switch (limitType) {
      case 'ip_daily':
        windowStart = new Date(now);
        windowStart.setHours(0, 0, 0, 0);
        expiresAt = new Date(windowStart);
        expiresAt.setDate(expiresAt.getDate() + 1);
        break;
      case 'email_hourly':
        windowStart = new Date(now);
        windowStart.setMinutes(0, 0, 0);
        expiresAt = new Date(windowStart);
        expiresAt.setHours(expiresAt.getHours() + 1);
        break;
      case 'same_operation':
        windowStart = now;
        expiresAt = new Date(now);
        expiresAt.setSeconds(
          expiresAt.getSeconds() + this.mailConfig.rateLimitSameOperation + 60,
        );
        break;
    }

    const existing = await this.rateLimitRepository.findOne({
      where: {
        identifier,
        limitType,
        windowStart,
        ...(operationType && { operationType }),
      },
    });

    if (existing) {
      existing.count += 1;
      await this.rateLimitRepository.save(existing);
    } else {
      await this.rateLimitRepository.save({
        identifier,
        limitType,
        count: 1,
        operationType,
        windowStart,
        expiresAt,
      });
    }
  }

  /**
   * 清理过期的限流记录
   */
  async cleanupExpiredRecords(): Promise<void> {
    const now = new Date();
    const result = await this.rateLimitRepository.delete({
      expiresAt: MoreThan(now),
    });

    this.logger.log(`清理了 ${result.affected || 0} 条过期限流记录`);
  }

  // ==================== 私有方法 ====================

  private async getRateLimitRecord(
    identifier: string,
    limitType: 'ip_daily' | 'email_hourly',
    windowStart: Date,
  ): Promise<MailRateLimitEntity | null> {
    return await this.rateLimitRepository.findOne({
      where: {
        identifier,
        limitType,
        windowStart: MoreThan(windowStart),
      },
      order: { windowStart: 'DESC' },
    });
  }
}
