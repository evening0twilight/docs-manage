import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileSystemItemEntity } from './document.entity';
import { DocumentPermission } from './document-permission.entity';

/**
 * 文档访问权限校验服务
 *
 * 统一的归属/权限判断,供版本、评论等控制器在操作前调用,避免越权(IDOR)。
 * 规则:
 * - 读(read):公开文档 / 创建者 / 拥有 canRead 权限的协作者
 * - 写(write):创建者 / 拥有 canWrite 权限的协作者
 */
@Injectable()
export class DocumentAccessService {
  constructor(
    @InjectRepository(FileSystemItemEntity)
    private readonly documentRepository: Repository<FileSystemItemEntity>,
    @InjectRepository(DocumentPermission)
    private readonly permissionRepository: Repository<DocumentPermission>,
  ) {}

  /** 加载文档(不存在或已删除则抛 404) */
  private async loadDocument(
    documentId: number,
  ): Promise<FileSystemItemEntity> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, isDeleted: false },
    });
    if (!document) {
      throw new NotFoundException('文档不存在');
    }
    return document;
  }

  /** 校验读权限,通过则返回文档实体 */
  async assertCanRead(
    documentId: number,
    userId: number,
  ): Promise<FileSystemItemEntity> {
    const document = await this.loadDocument(documentId);
    if (document.visibility === 'public' || document.creatorId === userId) {
      return document;
    }
    const permission = await this.permissionRepository.findOne({
      where: { documentId, userId },
    });
    if (permission?.canRead) {
      return document;
    }
    throw new ForbiddenException('无权访问此文档');
  }

  /** 校验写权限,通过则返回文档实体 */
  async assertCanWrite(
    documentId: number,
    userId: number,
  ): Promise<FileSystemItemEntity> {
    const document = await this.loadDocument(documentId);
    if (document.creatorId === userId) {
      return document;
    }
    const permission = await this.permissionRepository.findOne({
      where: { documentId, userId },
    });
    if (permission?.canWrite) {
      return document;
    }
    throw new ForbiddenException('无权修改此文档');
  }
}
