import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileSystemItemEntity } from './document.entity';
import { DocumentVersionEntity } from './document-version.entity';
import * as zlib from 'zlib';
import { promisify } from 'util';
import * as crypto from 'crypto';

const gzip = promisify(zlib.gzip);

/**
 * 文档每日版本自动保存服务
 * 每天凌晨0点执行,为昨天有修改的文档创建自动版本
 */
@Injectable()
export class DocumentDailyVersionService {
  private readonly logger = new Logger(DocumentDailyVersionService.name);

  constructor(
    @InjectRepository(FileSystemItemEntity)
    private readonly documentRepository: Repository<FileSystemItemEntity>,
    @InjectRepository(DocumentVersionEntity)
    private readonly versionRepository: Repository<DocumentVersionEntity>,
  ) {}

  /**
   * 定时任务: 每天凌晨0点执行,为昨天有更新的文档创建版本
   */
  @Cron('0 0 * * *') // 每天00:00
  async handleDailyVersionCreation() {
    this.logger.log('🕐 开始执行每日版本自动保存任务');

    try {
      const result = await this.createDailyVersions();
      this.logger.log(
        `✅ 每日版本创建完成: 检查了 ${result.checkedDocuments} 个文档, 创建了 ${result.createdVersions} 个版本`,
      );
    } catch (error) {
      this.logger.error('❌ 每日版本创建失败', error);
    }
  }

  /**
   * 为昨天有修改的文档创建自动版本
   */
  async createDailyVersions(): Promise<{
    checkedDocuments: number;
    createdVersions: number;
  }> {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // 昨天的开始时间

    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // 今天的开始时间

    // 1. 查找昨天有更新的文档
    const updatedDocuments = await this.documentRepository
      .createQueryBuilder('doc')
      .where('doc.itemType = :itemType', { itemType: 'document' })
      .andWhere('doc.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('doc.updated_time >= :yesterday', { yesterday })
      .andWhere('doc.updated_time < :today', { today })
      .getMany();

    this.logger.log(`📄 找到 ${updatedDocuments.length} 个昨天有更新的文档`);

    let createdVersions = 0;

    // 2. 为每个文档创建版本
    for (const doc of updatedDocuments) {
      try {
        // 检查昨天是否已经有自动版本
        const yesterdayVersion = await this.versionRepository
          .createQueryBuilder('version')
          .where('version.documentId = :documentId', { documentId: doc.id })
          .andWhere('version.isAutoSave = :isAutoSave', { isAutoSave: true })
          .andWhere('version.createdAt >= :yesterday', { yesterday })
          .andWhere('version.createdAt < :today', { today })
          .getOne();

        if (yesterdayVersion) {
          this.logger.debug(`⏭️  文档 ${doc.id} 昨天已有自动版本,跳过`);
          continue;
        }

        // 检查是否有内容
        if (!doc.content) {
          this.logger.debug(`⏭️  文档 ${doc.id} 内容为空,跳过`);
          continue;
        }

        // 计算内容哈希
        const contentHash = this.calculateHash(doc.content);

        // 检查最新版本是否内容相同
        const latestVersion = await this.versionRepository.findOne({
          where: { documentId: doc.id },
          order: { versionNumber: 'DESC' },
        });

        if (latestVersion && latestVersion.contentHash === contentHash) {
          this.logger.debug(`⏭️  文档 ${doc.id} 内容未变化,跳过`);
          continue;
        }

        // 压缩内容
        const compressedContent = await this.compressContent(doc.content);

        // 获取下一个版本号
        const nextVersionNumber = latestVersion
          ? latestVersion.versionNumber + 1
          : 1;

        // 创建每日自动版本
        const version = this.versionRepository.create({
          documentId: doc.id,
          versionNumber: nextVersionNumber,
          compressedContent,
          contentSize: Buffer.byteLength(doc.content, 'utf-8'),
          contentHash,
          authorId: doc.creatorId, // 使用文档创建者作为版本作者
          changeDescription: `每日自动保存 - ${yesterday.toLocaleDateString('zh-CN')}`,
          isAutoSave: true,
          isRestore: false,
          isDelta: false,
        });

        await this.versionRepository.save(version);
        createdVersions++;

        this.logger.log(
          `✅ 为文档 ${doc.id} (${doc.name}) 创建了每日版本 v${nextVersionNumber}`,
        );
      } catch (error) {
        this.logger.error(`❌ 为文档 ${doc.id} 创建版本失败:`, error);
      }
    }

    return {
      checkedDocuments: updatedDocuments.length,
      createdVersions,
    };
  }

  /**
   * 压缩内容
   */
  private async compressContent(content: string): Promise<Buffer> {
    return await gzip(Buffer.from(content, 'utf-8'));
  }

  /**
   * 计算内容哈希
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 手动触发每日版本创建(用于测试)
   */
  async triggerManually(): Promise<{
    checkedDocuments: number;
    createdVersions: number;
  }> {
    this.logger.log('📝 手动触发每日版本创建');
    return await this.createDailyVersions();
  }
}
