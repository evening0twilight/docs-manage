import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { DocumentVersionEntity } from './document-version.entity';
import * as DiffMatchPatch from 'diff-match-patch';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * 存储策略配置
 */
interface StorageConfig {
  deltaThreshold: number; // 差分存储阈值(字符变化率)
  fullVersionInterval: number; // 完整版本间隔
  compressionRatio: number; // 压缩率阈值
}

/**
 * 文档版本差分存储服务
 */
@Injectable()
export class DocumentVersionDeltaService {
  private readonly config: StorageConfig = {
    deltaThreshold: 0.3, // 变化超过30%时使用完整存储
    fullVersionInterval: 10, // 每10个版本存储一次完整版本
    compressionRatio: 20, // 压缩率低于20%时使用完整存储
  };

  constructor(
    @InjectRepository(DocumentVersionEntity)
    private readonly versionRepository: Repository<DocumentVersionEntity>,
  ) {}

  /**
   * 创建差分版本
   */
  async createDelta(baseContent: string, newContent: string): Promise<Buffer> {
    const dmp = new DiffMatchPatch.diff_match_patch();

    // 1. 计算差异
    const diffs = dmp.diff_main(baseContent, newContent);
    dmp.diff_cleanupEfficiency(diffs);

    // 2. 生成补丁
    const patches = dmp.patch_make(baseContent, diffs);
    const patchText = dmp.patch_toText(patches);

    // 3. 压缩补丁
    const compressed = await gzip(Buffer.from(patchText, 'utf-8'));

    return compressed;
  }

  /**
   * 应用差分恢复完整内容
   */
  async applyDelta(baseContent: string, deltaData: Buffer): Promise<string> {
    const dmp = new DiffMatchPatch.diff_match_patch();

    // 1. 解压差分数据
    const decompressed = await gunzip(deltaData);
    const patchText = decompressed.toString('utf-8');

    // 2. 解析补丁
    const patches = dmp.patch_fromText(patchText);

    // 3. 应用补丁
    const [result, success] = dmp.patch_apply(patches, baseContent);

    if (!success.every((s) => s)) {
      throw new Error('应用差分失败');
    }

    return result;
  }

  /**
   * 计算压缩率
   */
  calculateCompressionRatio(
    originalSize: number,
    compressedSize: number,
  ): number {
    return Math.round((1 - compressedSize / originalSize) * 100);
  }

  /**
   * 决定存储策略
   */
  async decideStorageStrategy(
    documentId: number,
    newContent: string,
  ): Promise<{
    strategy: 'full' | 'delta';
    baseVersionId?: number;
    reason: string;
  }> {
    // 1. 获取最后一个完整版本
    const lastFullVersion = await this.versionRepository.findOne({
      where: {
        documentId,
        isDelta: false,
      },
      order: { versionNumber: 'DESC' },
    });

    // 第一个版本,必须完整存储
    if (!lastFullVersion) {
      return {
        strategy: 'full',
        reason: '首个版本',
      };
    }

    // 2. 检查版本间隔
    const versionsSinceLastFull = await this.versionRepository.count({
      where: {
        documentId,
        versionNumber: MoreThanOrEqual(lastFullVersion.versionNumber),
      },
    });

    if (versionsSinceLastFull >= this.config.fullVersionInterval) {
      return {
        strategy: 'full',
        reason: `达到完整版本间隔(${this.config.fullVersionInterval})`,
      };
    }

    // 3. 计算变化率
    const lastContent = await this.decompressContent(
      lastFullVersion.compressedContent,
    );
    const changeRatio = this.calculateChangeRatio(lastContent, newContent);

    if (changeRatio > this.config.deltaThreshold) {
      return {
        strategy: 'full',
        reason: `变化率过高(${Math.round(changeRatio * 100)}%)`,
      };
    }

    // 4. 测试压缩效率
    const deltaData = await this.createDelta(lastContent, newContent);
    const fullData = await this.compressContent(newContent);
    const ratio = this.calculateCompressionRatio(
      fullData.length,
      deltaData.length,
    );

    if (ratio < this.config.compressionRatio) {
      return {
        strategy: 'full',
        reason: `差分压缩效率低(${ratio}%)`,
      };
    }

    // 使用差分存储
    return {
      strategy: 'delta',
      baseVersionId: lastFullVersion.id,
      reason: `差分存储(节省${ratio}%空间)`,
    };
  }

  /**
   * 计算变化率
   */
  private calculateChangeRatio(oldContent: string, newContent: string): number {
    const maxLength = Math.max(oldContent.length, newContent.length);
    if (maxLength === 0) return 0;

    // 简单的编辑距离估算
    let changes = Math.abs(oldContent.length - newContent.length);
    const minLength = Math.min(oldContent.length, newContent.length);

    for (let i = 0; i < minLength; i++) {
      if (oldContent[i] !== newContent[i]) {
        changes++;
      }
    }

    return changes / maxLength;
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
}
