import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersionEntity } from './document-version.entity';
import { FileSystemItemEntity } from './document.entity';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { promisify } from 'util';
import {
  SaveVersionDto,
  QueryVersionDto,
  RestoreVersionDto,
  CleanVersionDto,
} from './dto/version.dto';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * 文档版本管理服务
 */
@Injectable()
export class DocumentVersionService {
  constructor(
    @InjectRepository(DocumentVersionEntity)
    private readonly versionRepository: Repository<DocumentVersionEntity>,
    @InjectRepository(FileSystemItemEntity)
    private readonly documentRepository: Repository<FileSystemItemEntity>,
  ) {}

  /**
   * 保存文档版本
   */
  async saveVersion(
    documentId: number,
    userId: number,
    dto: SaveVersionDto,
  ): Promise<DocumentVersionEntity> {
    // 1. 验证文档存在
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    // 2. 计算内容哈希
    const contentHash = this.calculateHash(dto.content);

    // 3. 检查是否有相同内容的版本(去重)
    const existingVersion = await this.versionRepository.findOne({
      where: {
        documentId,
        contentHash,
      },
      order: { versionNumber: 'DESC' },
    });

    // 如果内容完全相同,不创建新版本
    if (existingVersion) {
      return existingVersion;
    }

    // 4. 压缩内容
    const compressedContent = await this.compressContent(dto.content);

    // 5. 获取下一个版本号
    const lastVersion = await this.versionRepository.findOne({
      where: { documentId },
      order: { versionNumber: 'DESC' },
    });

    const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    // 6. 创建新版本
    const version = this.versionRepository.create({
      documentId,
      versionNumber: nextVersionNumber,
      compressedContent,
      contentSize: Buffer.byteLength(dto.content, 'utf-8'),
      contentHash,
      authorId: userId,
      changeDescription: dto.changeDescription,
      isAutoSave: dto.isAutoSave ?? true,
      isRestore: false,
      isDelta: false,
    });

    return await this.versionRepository.save(version);
  }

  /**
   * 获取版本列表
   */
  async getVersions(
    documentId: number,
    dto: QueryVersionDto,
  ): Promise<{
    versions: DocumentVersionEntity[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const { page = 1, pageSize = 20 } = dto;
    const skip = (page - 1) * pageSize;

    const [versions, total] = await this.versionRepository.findAndCount({
      where: { documentId },
      relations: ['author'],
      order: { versionNumber: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      versions,
      total,
      page,
      pageSize,
      hasMore: skip + versions.length < total,
    };
  }

  /**
   * 获取版本详情(包含内容)
   */
  async getVersionDetail(
    documentId: number,
    versionId: number,
  ): Promise<DocumentVersionEntity & { content: string }> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId, documentId },
      relations: ['author'],
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    // 解压内容
    const content = await this.decompressContent(version.compressedContent);

    return {
      ...version,
      content,
    };
  }

  /**
   * 恢复到指定版本
   */
  async restoreVersion(
    documentId: number,
    userId: number,
    dto: RestoreVersionDto,
  ): Promise<DocumentVersionEntity> {
    // 1. 获取目标版本
    const targetVersion = await this.versionRepository.findOne({
      where: { id: dto.versionId, documentId },
    });

    if (!targetVersion) {
      throw new NotFoundException('目标版本不存在');
    }

    // 2. 解压目标版本内容
    const content = await this.decompressContent(
      targetVersion.compressedContent,
    );

    // 3. 更新文档内容
    await this.documentRepository.update(documentId, {
      content,
    });

    // 4. 创建恢复版本记录
    const compressedContent = await this.compressContent(content);
    const contentHash = this.calculateHash(content);

    const lastVersion = await this.versionRepository.findOne({
      where: { documentId },
      order: { versionNumber: 'DESC' },
    });

    const restoreVersion = this.versionRepository.create({
      documentId,
      versionNumber: (lastVersion?.versionNumber || 0) + 1,
      compressedContent,
      contentSize: Buffer.byteLength(content, 'utf-8'),
      contentHash,
      authorId: userId,
      changeDescription: `恢复到版本 ${targetVersion.versionNumber}`,
      isAutoSave: false,
      isRestore: true,
      isDelta: false,
    });

    return await this.versionRepository.save(restoreVersion);
  }

  /**
   * 清理旧版本
   */
  async cleanOldVersions(
    documentId: number,
    dto: CleanVersionDto,
  ): Promise<{ deleted: number }> {
    const { keepDays = 30 } = dto;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    // 只删除自动保存的旧版本
    const result = await this.versionRepository
      .createQueryBuilder()
      .delete()
      .where('document_id = :documentId', { documentId })
      .andWhere('is_auto_save = true')
      .andWhere('created_at < :cutoffDate', { cutoffDate })
      .execute();

    return { deleted: result.affected || 0 };
  }

  /**
   * 压缩内容
   */
  private async compressContent(content: string): Promise<Buffer> {
    const buffer = Buffer.from(content, 'utf-8');
    return await gzip(buffer);
  }

  /**
   * 解压内容
   */
  private async decompressContent(compressed: Buffer): Promise<string> {
    const decompressed = await gunzip(compressed);
    return decompressed.toString('utf-8');
  }

  /**
   * 计算SHA256哈希
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 获取文档的最新版本号
   */
  async getLatestVersionNumber(documentId: number): Promise<number> {
    const lastVersion = await this.versionRepository.findOne({
      where: { documentId },
      order: { versionNumber: 'DESC' },
    });

    return lastVersion?.versionNumber || 0;
  }

  /**
   * 删除版本
   */
  async deleteVersion(
    documentId: number,
    versionId: number,
  ): Promise<{ message: string }> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId, documentId },
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    await this.versionRepository.remove(version);

    return { message: '版本已删除' };
  }
}
