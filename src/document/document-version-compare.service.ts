import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersionEntity } from './document-version.entity';
import * as DiffMatchPatch from 'diff-match-patch';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

/**
 * 差异项
 */
export interface DiffItem {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

/**
 * 对比结果
 */
export interface VersionCompareResult {
  sourceVersion: {
    id: number;
    versionNumber: number;
    createdAt: Date;
  };
  targetVersion: {
    id: number;
    versionNumber: number;
    createdAt: Date;
  };
  diffs: DiffItem[];
  stats: {
    additions: number; // 新增字符数
    deletions: number; // 删除字符数
    unchanged: number; // 未变化字符数
  };
}

/**
 * 文档版本对比服务
 */
@Injectable()
export class DocumentVersionCompareService {
  constructor(
    @InjectRepository(DocumentVersionEntity)
    private readonly versionRepository: Repository<DocumentVersionEntity>,
  ) {}

  /**
   * 对比两个版本
   */
  async compareVersions(
    documentId: number,
    sourceVersionId: number,
    targetVersionId: number,
  ): Promise<VersionCompareResult> {
    // 1. 获取两个版本
    const [sourceVersion, targetVersion] = await Promise.all([
      this.versionRepository.findOne({
        where: { id: sourceVersionId, documentId },
      }),
      this.versionRepository.findOne({
        where: { id: targetVersionId, documentId },
      }),
    ]);

    if (!sourceVersion || !targetVersion) {
      throw new NotFoundException('版本不存在');
    }

    // 2. 解压内容
    const [sourceContent, targetContent] = await Promise.all([
      this.decompressContent(sourceVersion.compressedContent),
      this.decompressContent(targetVersion.compressedContent),
    ]);

    // 3. 执行差异对比
    const dmp = new DiffMatchPatch.diff_match_patch();
    const diffs = dmp.diff_main(sourceContent, targetContent);
    dmp.diff_cleanupSemantic(diffs); // 语义化优化

    // 4. 统计变化
    const stats = {
      additions: 0,
      deletions: 0,
      unchanged: 0,
    };

    const diffItems: DiffItem[] = diffs.map(([type, text]) => {
      const length = text.length;
      if (type === 1) {
        stats.additions += length;
        return { type: 'insert', text };
      } else if (type === -1) {
        stats.deletions += length;
        return { type: 'delete', text };
      } else {
        stats.unchanged += length;
        return { type: 'equal', text };
      }
    });

    return {
      sourceVersion: {
        id: sourceVersion.id,
        versionNumber: sourceVersion.versionNumber,
        createdAt: sourceVersion.createdAt,
      },
      targetVersion: {
        id: targetVersion.id,
        versionNumber: targetVersion.versionNumber,
        createdAt: targetVersion.createdAt,
      },
      diffs: diffItems,
      stats,
    };
  }

  /**
   * 解压内容
   */
  private async decompressContent(compressed: Buffer): Promise<string> {
    const decompressed = await gunzip(compressed);
    return decompressed.toString('utf-8');
  }

  /**
   * 生成对比HTML (用于邮件通知等场景)
   */
  generateCompareHtml(result: VersionCompareResult): string {
    let html = '<div class="version-compare">';

    result.diffs.forEach((diff) => {
      const escapedText = this.escapeHtml(diff.text);
      if (diff.type === 'insert') {
        html += `<ins>${escapedText}</ins>`;
      } else if (diff.type === 'delete') {
        html += `<del>${escapedText}</del>`;
      } else {
        html += `<span>${escapedText}</span>`;
      }
    });

    html += '</div>';
    return html;
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
}
