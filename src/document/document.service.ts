import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './document.entity';
import { DocumentRo } from './interfaces/docs.interface';
import {
  CreateDocumentDto,
  DocumentType,
  DocumentVisibility,
} from './dto/create-document.dto';
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
      creatorId, // 直接设置creatorId
      visibility: createDocumentDto.visibility || 'public', // 默认为公开，便于测试
      isDeleted: false,
    };

    return await this.documentRepository.save(documentData);
  }

  // 获取文档列表 (支持权限过滤)
  async findDocsList(
    query: QueryDocumentDto,
    currentUserId?: number,
  ): Promise<{ list: DocumentEntity[]; count: number }> {
    console.log('=== findDocsList Debug Info ===');
    console.log('currentUserId:', currentUserId);
    console.log('query:', query);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    const qb = this.documentRepository.createQueryBuilder('doc');

    // 基础查询条件 - 排除已删除
    qb.where('doc.isDeleted = :isDeleted', { isDeleted: false });
    console.log('Base condition added: isDeleted = false');

    // 搜索条件
    if (query.keyword) {
      qb.andWhere('doc.title LIKE :keyword', { keyword: `%${query.keyword}%` });
      console.log('Keyword filter added:', query.keyword);
    }

    if (query.type) {
      const typeNumber = this.getTypeNumber(query.type);
      qb.andWhere('doc.type = :type', { type: typeNumber });
      console.log('Type filter added:', query.type, '->', typeNumber);
    }

    // 权限控制逻辑
    console.log('Applying permission logic...');
    // 检查query中的可见性过滤器或onlyMine标志
    if (query.onlyMine === true && currentUserId) {
      // 只显示自己的文档
      qb.andWhere('doc.creator_id = :currentUserId', { currentUserId });
      console.log('Permission: Only own docs for user', currentUserId);
    } else if (
      query.visibility === DocumentVisibility.PRIVATE &&
      currentUserId
    ) {
      // 只显示自己的私有文档
      qb.andWhere(
        'doc.creator_id = :currentUserId AND doc.visibility = :private',
        {
          currentUserId,
          private: 'private',
        },
      );
      console.log('Permission: Only own private docs for user', currentUserId);
    } else if (currentUserId) {
      // 如果用户已登录，只显示公开文档和自己的文档
      qb.andWhere(
        '(doc.visibility = :public OR doc.creator_id = :currentUserId)',
        {
          public: 'public',
          currentUserId,
        },
      );
      console.log('Permission: Public docs OR own docs for user', currentUserId);
    } else {
      // 未登录用户只能看公开文档
      qb.andWhere('doc.visibility = :public', { public: 'public' });
      console.log('Permission: Only public docs (no user logged in)');
    }

    console.log('Generated SQL:', qb.getSql());
    console.log('Query parameters:', qb.getParameters());

    qb.orderBy('doc.created_time', 'DESC');

    const count = await qb.getCount();
    console.log('Total count before pagination:', count);
    
    const { page = 1, limit = 10 } = query;
    console.log('Pagination: page =', page, ', limit =', limit);

    qb.limit(Number(limit));
    qb.offset(Number(limit) * (Number(page) - 1));

    const docs = await qb.getMany();
    console.log('Retrieved docs count:', docs.length);
    
    if (docs.length > 0) {
      console.log('Sample document:', {
        id: docs[0].id,
        title: docs[0].title,
        visibility: docs[0].visibility,
        creatorId: docs[0].creatorId,
        isDeleted: docs[0].isDeleted,
      });
    }

    // 为了调试，让我们也查询一下数据库中的原始数据
    const allDocs = await this.documentRepository.find({
      take: 5,
      order: { created_time: 'DESC' },
    });
    console.log(
      'Raw docs in DB (first 5):',
      allDocs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        visibility: doc.visibility,
        creatorId: doc.creatorId,
        isDeleted: doc.isDeleted,
      })),
    );

    console.log('=== End Debug Info ===');

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
      .where('doc.creator_id = :creatorId', { creatorId })
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

  // 工具方法：将DocumentType枚举转换为数字
  private getTypeNumber(type: DocumentType): number {
    switch (type) {
      case DocumentType.TEXT:
        return 1;
      case DocumentType.IMAGE:
        return 2;
      case DocumentType.PDF:
        return 3;
      case DocumentType.WORD:
        return 4;
      case DocumentType.EXCEL:
        return 5;
      case DocumentType.OTHER:
        return 6;
      default:
        return 6; // other
    }
  }
}
