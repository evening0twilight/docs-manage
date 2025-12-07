import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersionEntity } from './document-version.entity';
import { FileSystemItemEntity } from './document.entity';

/**
 * 冲突信息
 */
export interface ConflictInfo {
  hasConflict: boolean;
  latestVersion: DocumentVersionEntity | null;
  yourVersion: number;
  message: string;
}

/**
 * 文档版本冲突检测服务
 */
@Injectable()
export class DocumentVersionConflictService {
  constructor(
    @InjectRepository(DocumentVersionEntity)
    private readonly versionRepository: Repository<DocumentVersionEntity>,
    @InjectRepository(FileSystemItemEntity)
    private readonly documentRepository: Repository<FileSystemItemEntity>,
  ) {}

  /**
   * 检测保存冲突
   */
  async detectConflict(
    documentId: number,
    userId: number,
    clientVersion: number,
  ): Promise<ConflictInfo> {
    // 获取最新版本
    const latestVersion = await this.versionRepository.findOne({
      where: { documentId },
      order: { versionNumber: 'DESC' },
      relations: ['author'],
    });

    if (!latestVersion) {
      return {
        hasConflict: false,
        latestVersion: null,
        yourVersion: clientVersion,
        message: '无冲突',
      };
    }

    // 检查版本号
    if (latestVersion.versionNumber > clientVersion) {
      return {
        hasConflict: true,
        latestVersion,
        yourVersion: clientVersion,
        message: `检测到冲突: 服务器版本(v${latestVersion.versionNumber}) > 客户端版本(v${clientVersion})`,
      };
    }

    return {
      hasConflict: false,
      latestVersion,
      yourVersion: clientVersion,
      message: '无冲突',
    };
  }

  /**
   * 自动合并冲突(简单策略)
   */
  async autoMergeConflict(
    documentId: number,
    clientContent: string,
    clientVersion: number,
  ): Promise<{
    merged: boolean;
    content: string;
    newVersion: number;
  }> {
    const conflict = await this.detectConflict(documentId, 0, clientVersion);

    if (!conflict.hasConflict) {
      // 无冲突,直接保存
      return {
        merged: false,
        content: clientContent,
        newVersion: (conflict.latestVersion?.versionNumber ?? 0) + 1,
      };
    }

    // 简单策略: 使用"后写入优先"(Last Write Wins)
    // 实际项目中可以使用CRDTs或OT算法进行更智能的合并
    return {
      merged: true,
      content: clientContent,
      newVersion: (conflict.latestVersion?.versionNumber ?? 0) + 1,
    };
  }

  /**
   * 获取冲突详情(用于前端展示)
   */
  async getConflictDetails(
    documentId: number,
    clientVersion: number,
  ): Promise<{
    serverVersion: DocumentVersionEntity;
    clientVersion: number;
    conflictedFields: string[];
  } | null> {
    const serverVersion = await this.versionRepository.findOne({
      where: { documentId },
      order: { versionNumber: 'DESC' },
      relations: ['author'],
    });

    if (!serverVersion) {
      return null;
    }

    return {
      serverVersion,
      clientVersion,
      conflictedFields: ['content'], // 简化处理,实际可以更详细
    };
  }
}
