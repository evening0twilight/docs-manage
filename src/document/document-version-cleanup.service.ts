import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { DocumentVersionEntity } from './document-version.entity';

/**
 * 文档版本清理服务
 */
@Injectable()
export class DocumentVersionCleanupService {
  private readonly logger = new Logger(DocumentVersionCleanupService.name);

  constructor(
    @InjectRepository(DocumentVersionEntity)
    private readonly versionRepository: Repository<DocumentVersionEntity>,
  ) {}

  /**
   * 定时清理任务(每天凌晨3点)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    this.logger.log('开始执行版本清理任务');

    try {
      const result = await this.cleanupOldVersions();
      this.logger.log(
        `版本清理完成: 删除 ${result.deleted} 个版本, 释放 ${result.freedSpace} MB`,
      );
    } catch (error) {
      this.logger.error('版本清理失败', error);
    }
  }

  /**
   * 清理策略
   * 1. 保留最近30天的所有版本
   * 2. 30-90天保留每天一个版本
   * 3. 90天以上保留每周一个版本
   * 4. 永久保留手动保存的版本
   */
  async cleanupOldVersions(): Promise<{
    deleted: number;
    freedSpace: number;
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    let totalDeleted = 0;
    let totalFreed = 0;

    // 1. 清理30-90天的自动保存版本(保留每天第一个)
    const mediumOldVersions = await this.versionRepository
      .createQueryBuilder('v')
      .where('v.createdAt BETWEEN :ninety AND :thirty', {
        ninety: ninetyDaysAgo,
        thirty: thirtyDaysAgo,
      })
      .andWhere('v.isAutoSave = true')
      .orderBy('v.documentId', 'ASC')
      .addOrderBy('v.createdAt', 'DESC')
      .getMany();

    const toDeleteMedium = this.filterKeepOnePerDay(mediumOldVersions);
    totalDeleted += toDeleteMedium.length;
    totalFreed += toDeleteMedium.reduce(
      (sum, v) => sum + v.compressedContent.length,
      0,
    );

    // 2. 清理90天以上的自动保存版本(保留每周第一个)
    const veryOldVersions = await this.versionRepository.find({
      where: {
        createdAt: LessThan(ninetyDaysAgo),
        isAutoSave: true,
      },
      order: { documentId: 'ASC', createdAt: 'DESC' },
    });

    const toDeleteOld = this.filterKeepOnePerWeek(veryOldVersions);
    totalDeleted += toDeleteOld.length;
    totalFreed += toDeleteOld.reduce(
      (sum, v) => sum + v.compressedContent.length,
      0,
    );

    // 3. 执行删除
    const allToDelete = [...toDeleteMedium, ...toDeleteOld];
    if (allToDelete.length > 0) {
      await this.versionRepository.remove(allToDelete);
    }

    return {
      deleted: totalDeleted,
      freedSpace: Math.round(totalFreed / (1024 * 1024)), // 转换为MB
    };
  }

  /**
   * 过滤保留每天第一个版本
   */
  private filterKeepOnePerDay(
    versions: DocumentVersionEntity[],
  ): DocumentVersionEntity[] {
    const toDelete: DocumentVersionEntity[] = [];
    const keepMap = new Map<string, boolean>();

    versions.forEach((version) => {
      const dateKey = `${version.documentId}-${version.createdAt.toISOString().split('T')[0]}`;

      if (keepMap.has(dateKey)) {
        toDelete.push(version);
      } else {
        keepMap.set(dateKey, true);
      }
    });

    return toDelete;
  }

  /**
   * 过滤保留每周第一个版本
   */
  private filterKeepOnePerWeek(
    versions: DocumentVersionEntity[],
  ): DocumentVersionEntity[] {
    const toDelete: DocumentVersionEntity[] = [];
    const keepMap = new Map<string, boolean>();

    versions.forEach((version) => {
      const weekKey = `${version.documentId}-${this.getWeekNumber(version.createdAt)}`;

      if (keepMap.has(weekKey)) {
        toDelete.push(version);
      } else {
        keepMap.set(weekKey, true);
      }
    });

    return toDelete;
  }

  /**
   * 获取周数
   */
  private getWeekNumber(date: Date): string {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil(
      (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7,
    );
    return `${date.getFullYear()}-W${weekNumber}`;
  }
}
