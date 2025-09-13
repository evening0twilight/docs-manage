import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './document.entity';
import { DocumentRo } from './interfaces/docs.interface';
import { CreateDocumentDto, DocumentType } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  // 创建文档 (需要传入当前用户ID)
  async create(
    createDocumentDto: CreateDocumentDto,
    creatorId: number,
  ): Promise<DocumentEntity> {
    const { title } = createDocumentDto;
    if (!title) {
      throw new HttpException('缺少文档标题', HttpStatus.BAD_REQUEST);
    }

    // 检查同一用户是否已创建同名文档
    const existingDoc = await this.documentRepository.findOne({
      where: {
        title,
        creatorId,
        isDeleted: false,
      },
    });

    if (existingDoc) {
      throw new HttpException('您已创建了同名文档', HttpStatus.CONFLICT);
    }

    // 转换 DocumentType 枚举为数字
    let typeNumber = 1; // 默认值
    if (createDocumentDto.type) {
      switch (createDocumentDto.type) {
        case DocumentType.TEXT:
          typeNumber = 1;
          break;
        case DocumentType.IMAGE:
          typeNumber = 2;
          break;
        case DocumentType.PDF:
          typeNumber = 3;
          break;
        case DocumentType.WORD:
          typeNumber = 4;
          break;
        case DocumentType.EXCEL:
          typeNumber = 5;
          break;
        case DocumentType.OTHER:
          typeNumber = 6;
          break;
        default:
          typeNumber = 6; // other
      }
    }

    // 创建文档时自动设置创建者
    const documentData: Partial<DocumentEntity> = {
      title: createDocumentDto.title,
      content: createDocumentDto.content || '',
      author: 'System', // 可以后续从用户信息中获取
      thumb_url: createDocumentDto.filePath || '',
      type: typeNumber,
      creatorId,
      visibility: createDocumentDto.visibility || 'private',
      isDeleted: false,
    };

    return await this.documentRepository.save(documentData);
  }

  // 获取文档列表 (支持权限过滤)
  async findDocsList(
    query: QueryDocumentDto,
    currentUserId?: number,
  ): Promise<DocumentRo> {
    const qb = this.documentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.creator', 'creator')
      .where('doc.isDeleted = :isDeleted', { isDeleted: false });

    // 关键词搜索
    if (query.keyword) {
      qb.andWhere('(doc.title LIKE :keyword OR doc.content LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
    }

    // 文档类型过滤
    if (query.type) {
      qb.andWhere('doc.type = :type', { type: query.type });
    }

    // 可见性过滤
    if (query.visibility) {
      qb.andWhere('doc.visibility = :visibility', {
        visibility: query.visibility,
      });
    }

    // 创建者过滤
    if (query.creatorId) {
      qb.andWhere('doc.creatorId = :creatorId', { creatorId: query.creatorId });
    }

    // 只查询自己的文档
    if (query.onlyMine && currentUserId) {
      qb.andWhere('doc.creatorId = :currentUserId', { currentUserId });
    } else if (currentUserId) {
      // 如果用户已登录，只显示公开文档和自己的文档
      qb.andWhere(
        '(doc.visibility = :public OR doc.creatorId = :currentUserId)',
        {
          public: 'public',
          currentUserId,
        },
      );
    } else {
      // 未登录用户只能看公开文档
      qb.andWhere('doc.visibility = :public', { public: 'public' });
    }

    qb.orderBy('doc.created_time', 'DESC');

    const count = await qb.getCount();
    const { page = 1, limit = 10 } = query;

    qb.limit(Number(limit));
    qb.offset(Number(limit) * (Number(page) - 1));

    const docs = await qb.getMany();

    return { list: docs, count: count };
  }

  // 获取文档详情 (检查访问权限)
  async findDocsOne(
    id: number,
    currentUserId?: number,
  ): Promise<DocumentEntity | null> {
    const doc = await this.documentRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['creator'],
    });

    if (!doc) {
      throw new HttpException('文档不存在', HttpStatus.NOT_FOUND);
    }

    // 权限检查
    if (doc.visibility === 'private' && doc.creatorId !== currentUserId) {
      throw new HttpException('无权访问此文档', HttpStatus.FORBIDDEN);
    }

    return doc;
  }

  // 更新文档 (只有创建者可以更新)
  async updateById(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    currentUserId: number,
  ): Promise<DocumentEntity> {
    const existDoc = await this.documentRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!existDoc) {
      throw new HttpException('文档不存在', HttpStatus.NOT_FOUND);
    }

    // 权限检查：只有创建者可以更新
    if (existDoc.creatorId !== currentUserId) {
      throw new HttpException('无权修改此文档', HttpStatus.FORBIDDEN);
    }

    // 转换 DocumentType 枚举为数字
    let typeNumber: number | undefined;
    if (updateDocumentDto.type) {
      switch (updateDocumentDto.type) {
        case DocumentType.TEXT:
          typeNumber = 1;
          break;
        case DocumentType.IMAGE:
          typeNumber = 2;
          break;
        case DocumentType.PDF:
          typeNumber = 3;
          break;
        case DocumentType.WORD:
          typeNumber = 4;
          break;
        case DocumentType.EXCEL:
          typeNumber = 5;
          break;
        case DocumentType.OTHER:
          typeNumber = 6;
          break;
      }
    }

    // 准备更新数据
    const updateData: Partial<DocumentEntity> = {
      ...updateDocumentDto,
      type: typeNumber || existDoc.type, // 如果没有传入type，保持原值
    };

    // 移除不需要的字段
    delete (updateData as any).type; // 先删除，然后重新设置
    if (typeNumber !== undefined) {
      updateData.type = typeNumber;
    }

    const updatedDoc = this.documentRepository.merge(existDoc, updateData);
    return this.documentRepository.save(updatedDoc);
  }

  // 删除文档 (软删除，只有创建者可以删除)
  async remove(id: number, currentUserId: number): Promise<void> {
    const existDoc = await this.documentRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!existDoc) {
      throw new HttpException(`id为${id}的文档不存在`, HttpStatus.NOT_FOUND);
    }

    // 权限检查：只有创建者可以删除
    if (existDoc.creatorId !== currentUserId) {
      throw new HttpException('无权删除此文档', HttpStatus.FORBIDDEN);
    }

    // 软删除
    existDoc.isDeleted = true;
    await this.documentRepository.save(existDoc);
  }

  // 获取用户创建的文档列表
  async getMyDocuments(
    creatorId: number,
    query: QueryDocumentDto,
  ): Promise<DocumentRo> {
    const qb = this.documentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.creator', 'creator')
      .where('doc.creatorId = :creatorId', { creatorId })
      .andWhere('doc.isDeleted = :isDeleted', { isDeleted: false });

    if (query.keyword) {
      qb.andWhere('(doc.title LIKE :keyword OR doc.content LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
    }

    if (query.type) {
      qb.andWhere('doc.type = :type', { type: query.type });
    }

    if (query.visibility) {
      qb.andWhere('doc.visibility = :visibility', {
        visibility: query.visibility,
      });
    }

    qb.orderBy('doc.created_time', 'DESC');

    const count = await qb.getCount();
    const { page = 1, limit = 10 } = query;

    qb.limit(Number(limit));
    qb.offset(Number(limit) * (Number(page) - 1));

    const docs = await qb.getMany();

    return { list: docs, count: count };
  }
}
