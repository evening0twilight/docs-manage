import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import {
  FileSystemItemEntity,
  ItemType,
  DocumentType,
} from './document.entity';
import {
  CreateDocumentDto,
  CreateFolderDto,
  DocumentVisibility,
} from './dto/create-document.dto';
import {
  UpdateFileSystemItemDto,
  UpdateDocumentDto,
} from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { DocumentPermission } from './document-permission.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(FileSystemItemEntity)
    private readonly documentRepository: Repository<FileSystemItemEntity>,
    @InjectRepository(DocumentPermission)
    private readonly permissionRepository: Repository<DocumentPermission>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // 创建文档 (需要传入当前用户ID)
  async create(
    createDocumentDto: CreateDocumentDto,
    creatorId: number,
  ): Promise<FileSystemItemEntity> {
    const { title } = createDocumentDto;
    if (!title) {
      throw new HttpException('缺少文档标题', HttpStatus.BAD_REQUEST);
    }

    // 检查同一用户是否已创建同名文档
    const existingDoc = await this.documentRepository.findOne({
      where: {
        name: title,
        creatorId,
        isDeleted: false,
      },
    });

    if (existingDoc) {
      throw new HttpException('您已创建了同名文档', HttpStatus.CONFLICT);
    }

    // 创建文档时自动设置创建者
    const documentData: Partial<FileSystemItemEntity> = {
      name: title, // 新字段名
      description: createDocumentDto.description || '', // 文档描述
      itemType: ItemType.DOCUMENT, // 设置为文档类型
      content: createDocumentDto.content || '',
      author: 'System', // 可以后续从用户信息中获取
      documentType: createDocumentDto.type || DocumentType.TEXT, // 使用新的枚举字段
      creatorId, // 直接设置creatorId
      visibility: createDocumentDto.visibility || 'public', // 默认为公开，便于测试
      isDeleted: false,
      parentId: createDocumentDto.parentId || undefined, // 默认在根目录
      sortOrder: 0, // 默认排序
    };

    return await this.documentRepository.save(documentData);
  }

  // 创建文件夹
  async createFolder(
    createFolderDto: CreateFolderDto,
    creatorId: number,
  ): Promise<FileSystemItemEntity> {
    const { name } = createFolderDto;
    if (!name) {
      throw new HttpException('缺少文件夹名称', HttpStatus.BAD_REQUEST);
    }

    // 检查同一用户是否已创建同名文件夹
    const existingFolder = await this.documentRepository.findOne({
      where: {
        name,
        itemType: ItemType.FOLDER,
        creatorId,
        isDeleted: false,
        parentId: createFolderDto.parentId || undefined,
      },
    });

    if (existingFolder) {
      throw new HttpException('您已创建了同名文件夹', HttpStatus.CONFLICT);
    }

    // 创建文件夹
    const folderData: Partial<FileSystemItemEntity> = {
      name,
      description: createFolderDto.description || '', // 文件夹描述
      itemType: ItemType.FOLDER,
      creatorId,
      parentId: createFolderDto.parentId || undefined,
      isDeleted: false,
      sortOrder: 0,
      // 文件夹不需要设置content、documentType等字段
    };

    return await this.documentRepository.save(folderData);
  }

  // 获取文档列表 (支持权限过滤)
  async findDocsList(
    query: QueryDocumentDto,
    currentUserId?: number,
  ): Promise<{ list: FileSystemItemEntity[]; count: number }> {
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
      qb.andWhere('doc.name LIKE :keyword', { keyword: `%${query.keyword}%` });
      console.log('Keyword filter added:', query.keyword);
    }

    if (query.type) {
      qb.andWhere('doc.documentType = :type', { type: query.type });
      console.log('Type filter added:', query.type);
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
      console.log(
        'Permission: Public docs OR own docs for user',
        currentUserId,
      );
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
        title: docs[0].name,
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
        title: doc.name,
        visibility: doc.visibility,
        creatorId: doc.creatorId,
        isDeleted: doc.isDeleted,
      })),
    );

    console.log('=== End Debug Info ===');

    return { list: docs, count: count };
  }

  // 获取文档详情 (检查访问权限并返回权限信息)
  async findDocsOne(
    id: number,
    currentUserId?: number,
  ): Promise<
    FileSystemItemEntity & {
      permission?: string;
      isCollaborationEnabled?: boolean;
    }
  > {
    const doc = await this.documentRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['creator'],
    });

    if (!doc) {
      throw new HttpException('文档不存在', HttpStatus.NOT_FOUND);
    }

    // 调试日志
    console.log('[findDocsOne] 文档访问权限检查:', {
      documentId: id,
      documentName: doc.name,
      documentVisibility: doc.visibility,
      documentCreatorId: doc.creatorId,
      currentUserId: currentUserId,
      userIdType: typeof currentUserId,
      creatorIdType: typeof doc.creatorId,
      isEqual: doc.creatorId === currentUserId,
      isCollaborationEnabled: doc.isCollaborationEnabled,
    });

    // 确定用户权限
    let permission: string = 'viewer'; // 默认为查看者

    if (doc.creatorId === currentUserId) {
      // 文档创建者拥有所有权限
      permission = 'owner';
    } else {
      // 如果协同未开启，所有非owner用户只能是viewer
      if (!doc.isCollaborationEnabled) {
        permission = 'viewer';
      } else {
        // 查询权限表
        const userPermission = await this.permissionRepository.findOne({
          where: {
            documentId: id,
            userId: currentUserId,
          },
        });

        if (userPermission) {
          permission = userPermission.role; // 'editor' 或 'viewer'
        } else {
          // 如果不是创建者且没有权限记录
          if (doc.visibility === 'private') {
            console.warn(
              '[findDocsOne] 权限检查失败 - 用户无权访问private文档',
            );
            throw new HttpException('无权访问此文档', HttpStatus.FORBIDDEN);
          }
          // public 文档默认为 viewer
          permission = 'viewer';
        }
      }
    }

    // 只返回创建者的用户名，不返回敏感信息
    if (doc.creator) {
      const creatorInfo = {
        id: doc.creator.id,
        username: doc.creator.username,
      };
      doc.creator = creatorInfo as any;
    }

    // 添加权限字段和协同开关状态到返回结果
    return {
      ...doc,
      permission,
      isCollaborationEnabled: doc.isCollaborationEnabled,
    };
  }

  // 更新文档 (创建者和编辑者可以更新)
  async updateById(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    currentUserId: number,
  ): Promise<FileSystemItemEntity> {
    const existDoc = await this.documentRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!existDoc) {
      throw new HttpException('文档不存在', HttpStatus.NOT_FOUND);
    }

    // 权限检查：创建者拥有所有权限
    if (existDoc.creatorId === currentUserId) {
      // 创建者可以更新
    } else {
      // 非创建者需要检查权限表
      const userPermission = await this.permissionRepository.findOne({
        where: {
          documentId: id,
          userId: currentUserId,
        },
      });

      if (!userPermission) {
        throw new HttpException('无权修改此文档', HttpStatus.FORBIDDEN);
      }

      // 检查是否有写权限 (viewer 角色或 canWrite 为 false 都不能编辑)
      if (!userPermission.canWrite) {
        throw new HttpException(
          '您只有查看权限，无法编辑',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // 转换 DocumentType 枚举
    let documentType: DocumentType | undefined;
    if (updateDocumentDto.type) {
      documentType = updateDocumentDto.type; // 直接使用枚举值
    }

    // 准备更新数据
    const updateData: Partial<FileSystemItemEntity> = {
      ...updateDocumentDto,
      documentType: documentType || existDoc.documentType, // 如果没有传入type，保持原值
    };

    // 移除不需要的字段
    delete (updateData as any).type; // 删除原始的type字段

    const updatedDoc = this.documentRepository.merge(existDoc, updateData);
    return this.documentRepository.save(updatedDoc);
  }

  // 🆕 处理置顶逻辑的私有方法
  private async handlePinLogic(
    creatorId: number,
    updateDto: any,
    currentItemId?: number,
  ): Promise<void> {
    if (updateDto.isPinned === true) {
      // 置顶: 找到当前最小的 sortOrder,然后减1
      const queryBuilder = this.documentRepository
        .createQueryBuilder('item')
        .where('item.creatorId = :creatorId', { creatorId })
        .andWhere('item.isDeleted = false')
        .select('MIN(item.sortOrder)', 'min');

      // 如果是更新操作,排除当前项
      if (currentItemId) {
        queryBuilder.andWhere('item.id != :currentItemId', { currentItemId });
      }

      const result = await queryBuilder.getRawOne();
      const currentMin = result?.min ?? 0;

      // 如果当前最小值 >= 0, 说明没有置顶项,使用 -1
      // 如果当前最小值 < 0, 说明有置顶项,使用 最小值 - 1
      updateDto.sortOrder = currentMin >= 0 ? -1 : currentMin - 1;

      console.log('[置顶] 当前最小 sortOrder:', currentMin);
      console.log('[置顶] 新的 sortOrder:', updateDto.sortOrder);
    } else if (updateDto.isPinned === false) {
      // 取消置顶: 恢复为 0
      updateDto.sortOrder = 0;
      console.log('[取消置顶] 设置 sortOrder 为 0');
    }

    // 删除 isPinned 字段,不保存到数据库
    delete updateDto.isPinned;
  }

  // 🆕 检查循环引用的私有方法 (防止文件夹移动到自己的子文件夹中)
  private async checkCircularReference(
    folderId: number,
    targetParentId: number | null,
  ): Promise<void> {
    // 移动到根目录 (parentId = null) 不会造成循环
    if (targetParentId === null) {
      return;
    }

    // 不能移动到自己
    if (folderId === targetParentId) {
      throw new HttpException('不能将文件夹移动到自己', HttpStatus.BAD_REQUEST);
    }

    // 递归检查目标父文件夹是否在当前文件夹的子树中
    let currentParentId: number | null = targetParentId;
    const checkedIds = new Set<number>([folderId]); // 防止死循环

    while (currentParentId !== null) {
      // 如果目标文件夹的祖先是当前文件夹,说明会形成循环
      if (currentParentId === folderId) {
        throw new HttpException(
          '不能将文件夹移动到自己的子文件夹中',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 防止数据库中已存在循环导致的死循环
      if (checkedIds.has(currentParentId)) {
        throw new HttpException(
          '检测到文件夹结构异常,请联系管理员',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      checkedIds.add(currentParentId);

      // 查找父文件夹的父文件夹
      const parentFolder = await this.documentRepository.findOne({
        where: {
          id: currentParentId,
          itemType: ItemType.FOLDER,
          isDeleted: false,
        },
        select: ['parentId'],
      });

      if (!parentFolder) {
        // 父文件夹不存在,终止检查
        throw new HttpException('目标文件夹不存在', HttpStatus.NOT_FOUND);
      }

      currentParentId = parentFolder.parentId;
    }

    console.log(
      '[循环检查] 通过: 文件夹',
      folderId,
      '可以移动到',
      targetParentId,
    );
  }

  // 获取分享给我的文档列表
  async getSharedWithMe(
    currentUserId: number,
    page: number = 1,
    limit: number = 20,
    role?: string,
  ): Promise<{
    documents: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const queryBuilder = this.documentRepository
      .createQueryBuilder('doc')
      .innerJoin('document_permissions', 'p', 'doc.id = p.document_id')
      .innerJoin('users', 'u', 'doc.creator_id = u.id')
      .where('p.user_id = :userId', { userId: currentUserId })
      .andWhere('doc.isDeleted = false');

    // 如果指定了角色过滤
    if (role) {
      queryBuilder.andWhere('p.role = :role', { role });
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页查询
    const documents = await queryBuilder
      .select([
        'doc.id as id',
        'doc.name as name',
        'doc.description as description',
        'doc.itemType as itemType',
        'doc.updated_time as updated_time',
        'p.role as permission',
        'p.created_at as sharedAt',
        'u.id as owner_id',
        'u.username as owner_username',
        'u.email as owner_email',
      ])
      .orderBy('p.created_at', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit)
      .getRawMany();

    // 格式化返回数据
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      itemType: doc.itemType,
      updated_time: doc.updated_time,
      permission: doc.permission,
      sharedAt: doc.sharedAt,
      owner: {
        id: doc.owner_id,
        username: doc.owner_username,
        email: doc.owner_email,
      },
    }));

    return {
      documents: formattedDocuments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 智能统一更新方法 - 自动识别文件夹或文档
  async updateFileSystemItem(
    id: number,
    updateDto: UpdateFileSystemItemDto,
    currentUserId: number,
  ): Promise<FileSystemItemEntity> {
    const existingItem = await this.documentRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!existingItem) {
      throw new HttpException('项目不存在', HttpStatus.NOT_FOUND);
    }

    // 权限检查：创建者拥有所有权限
    if (existingItem.creatorId === currentUserId) {
      // 创建者可以更新
    } else {
      // 非创建者需要检查权限表
      const userPermission = await this.permissionRepository.findOne({
        where: {
          documentId: id,
          userId: currentUserId,
        },
      });

      if (!userPermission) {
        throw new HttpException('无权修改此项目', HttpStatus.FORBIDDEN);
      }

      // 检查是否有写权限 (editor 角色或 canWrite 为 true 才能编辑)
      if (!userPermission.canWrite) {
        throw new HttpException(
          '您只有查看权限，无法编辑',
          HttpStatus.FORBIDDEN,
        );
      }

      // 文件夹只有创建者可以修改
      if (existingItem.itemType === ItemType.FOLDER) {
        throw new HttpException(
          '只有创建者可以修改文件夹',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // 根据项目类型进行智能处理
    if (existingItem.itemType === ItemType.FOLDER) {
      return this.updateFolderItem(existingItem, updateDto);
    } else {
      return this.updateDocumentItem(existingItem, updateDto);
    }
  }

  // 更新文件夹项目
  private async updateFolderItem(
    folderItem: FileSystemItemEntity,
    updateDto: UpdateFileSystemItemDto,
  ): Promise<FileSystemItemEntity> {
    // 验证文件夹更新字段
    if (updateDto.title || updateDto.content || updateDto.type) {
      throw new HttpException(
        '文件夹不支持文档相关属性（title, content, type）',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 🆕 检查循环引用 (文件夹移动时)
    if (
      updateDto.parentId !== undefined &&
      updateDto.parentId !== folderItem.parentId
    ) {
      await this.checkCircularReference(folderItem.id, updateDto.parentId);
    }

    // 🆕 处理置顶逻辑
    if (updateDto.isPinned !== undefined) {
      await this.handlePinLogic(
        folderItem.creatorId,
        updateDto as any,
        folderItem.id,
      );
    }

    // 检查同名文件夹
    if (updateDto.name && updateDto.name !== folderItem.name) {
      const existingFolder = await this.documentRepository.findOne({
        where: {
          name: updateDto.name,
          itemType: ItemType.FOLDER,
          creatorId: folderItem.creatorId,
          parentId: updateDto.parentId ?? folderItem.parentId,
          isDeleted: false,
          id: Not(folderItem.id), // 排除自己
        },
      });

      if (existingFolder) {
        throw new HttpException(
          '同一位置已存在同名文件夹',
          HttpStatus.CONFLICT,
        );
      }
    }

    // 准备更新数据
    const updateData: Partial<FileSystemItemEntity> = {};
    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.parentId !== undefined)
      updateData.parentId = updateDto.parentId;
    if (updateDto.sortOrder !== undefined)
      updateData.sortOrder = updateDto.sortOrder; // 🆕 添加 sortOrder 更新

    const updatedItem = this.documentRepository.merge(folderItem, updateData);
    return this.documentRepository.save(updatedItem);
  }

  // 更新文档项目
  private async updateDocumentItem(
    documentItem: FileSystemItemEntity,
    updateDto: UpdateFileSystemItemDto,
  ): Promise<FileSystemItemEntity> {
    // 智能处理：如果传入name但没有title，将name转为title
    if (updateDto.name && !updateDto.title) {
      updateDto.title = updateDto.name;
    }

    // 验证文档更新字段
    if (
      updateDto.name &&
      updateDto.title &&
      updateDto.name !== updateDto.title
    ) {
      throw new HttpException(
        '文档更新时不能同时指定不同的name和title',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 🆕 处理置顶逻辑
    if (updateDto.isPinned !== undefined) {
      await this.handlePinLogic(
        documentItem.creatorId,
        updateDto as any,
        documentItem.id,
      );
    }

    // 检查同名文档
    if (updateDto.title && updateDto.title !== documentItem.name) {
      const existingDoc = await this.documentRepository.findOne({
        where: {
          name: updateDto.title,
          itemType: ItemType.DOCUMENT,
          creatorId: documentItem.creatorId,
          parentId: updateDto.parentId ?? documentItem.parentId,
          isDeleted: false,
          id: Not(documentItem.id), // 排除自己
        },
      });

      if (existingDoc) {
        throw new HttpException('同一位置已存在同名文档', HttpStatus.CONFLICT);
      }
    }

    // 准备更新数据
    const updateData: Partial<FileSystemItemEntity> = {};
    if (updateDto.title !== undefined) updateData.name = updateDto.title; // 文档用title更新name字段
    if (updateDto.content !== undefined) updateData.content = updateDto.content;
    if (updateDto.type !== undefined) updateData.documentType = updateDto.type;
    if (updateDto.parentId !== undefined)
      updateData.parentId = updateDto.parentId;
    if (updateDto.sortOrder !== undefined)
      updateData.sortOrder = updateDto.sortOrder; // 🆕 添加 sortOrder 更新

    const updatedItem = this.documentRepository.merge(documentItem, updateData);
    return this.documentRepository.save(updatedItem);
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

    // 🆕 如果是文件夹，检查是否包含子项
    if (existDoc.itemType === ItemType.FOLDER) {
      const childrenCount = await this.documentRepository.count({
        where: {
          parentId: id,
          isDeleted: false,
        },
      });

      if (childrenCount > 0) {
        throw new HttpException(
          `该文件夹下还有 ${childrenCount} 个项目，请先清空文件夹再删除`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 软删除
    existDoc.isDeleted = true;
    await this.documentRepository.save(existDoc);
  }

  // 切换协同编辑开关
  async toggleCollaboration(
    documentId: number,
    enabled: boolean,
    currentUserId: number,
  ): Promise<{
    isCollaborationEnabled: boolean;
    affectedPermissions: number;
  }> {
    // 查找文档
    const document = await this.documentRepository.findOne({
      where: { id: documentId, isDeleted: false },
    });

    if (!document) {
      throw new HttpException('文档不存在', HttpStatus.NOT_FOUND);
    }

    // 检查是否为文档所有者
    if (document.creatorId !== currentUserId) {
      throw new HttpException('仅文档所有者可以操作', HttpStatus.FORBIDDEN);
    }

    // 更新协同开关状态
    document.isCollaborationEnabled = enabled;
    await this.documentRepository.save(document);

    let affectedCount = 0;

    // 如果关闭协同，将所有非owner的editor权限降为viewer
    if (!enabled) {
      const permissions = await this.permissionRepository.find({
        where: {
          documentId,
          userId: Not(currentUserId),
          role: 'editor' as any,
        },
      });

      for (const permission of permissions) {
        permission.role = 'viewer' as any;
        permission.canWrite = false;
        permission.canDelete = false;
        permission.canShare = false;
      }

      if (permissions.length > 0) {
        await this.permissionRepository.save(permissions);
        affectedCount = permissions.length;
      }
    }

    // 通过WebSocket通知所有在线用户协同状态变化
    this.eventsGateway.notifyCollaborationToggle(
      String(documentId),
      enabled,
      String(currentUserId),
    );

    return {
      isCollaborationEnabled: enabled,
      affectedPermissions: affectedCount,
    };
  }

  // 获取用户创建的文档列表
  async getMyDocuments(
    creatorId: number,
    query: QueryDocumentDto,
  ): Promise<{ list: FileSystemItemEntity[]; count: number }> {
    const qb = this.documentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.creator', 'creator')
      .where('doc.creator_id = :creatorId', { creatorId })
      .andWhere('doc.isDeleted = :isDeleted', { isDeleted: false });

    if (query.keyword) {
      qb.andWhere('(doc.name LIKE :keyword OR doc.content LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
    }

    if (query.type) {
      qb.andWhere('doc.documentType = :type', { type: query.type });
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

  // 获取文件夹内容 (文件夹和文档)
  async getFolderContents(
    parentId: number | null,
    creatorId: number,
  ): Promise<FileSystemItemEntity[]> {
    return await this.documentRepository.find({
      where: {
        parentId: parentId || undefined,
        creatorId,
        isDeleted: false,
      },
      order: {
        itemType: 'ASC', // 文件夹排在前面
        sortOrder: 'ASC',
        created_time: 'DESC',
      },
    });
  }

  // 获取文件夹内容（带元信息，用于Keep-alive标签页）
  async getFolderContentsWithMeta(
    parentId: number | null,
    creatorId: number,
  ): Promise<{
    currentFolder: FileSystemItemEntity | null;
    contents: FileSystemItemEntity[];
    folderCount: number;
    documentCount: number;
  }> {
    // 获取当前文件夹信息（如果不是根目录）
    let currentFolder: FileSystemItemEntity | null = null;
    if (parentId) {
      currentFolder = await this.documentRepository.findOne({
        where: {
          id: parentId,
          creatorId,
          isDeleted: false,
          itemType: ItemType.FOLDER,
        },
      });

      if (!currentFolder) {
        throw new HttpException(
          '文件夹不存在或无权限访问',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    // 获取文件夹内容
    const contents = await this.getFolderContents(parentId, creatorId);

    // 统计数量
    const folderCount = contents.filter(
      (item) => item.itemType === ItemType.FOLDER,
    ).length;
    const documentCount = contents.filter(
      (item) => item.itemType === ItemType.DOCUMENT,
    ).length;

    return {
      currentFolder,
      contents,
      folderCount,
      documentCount,
    };
  }

  // 获取文件夹树结构
  async getFolderTree(creatorId: number): Promise<FileSystemItemEntity[]> {
    // 获取所有未删除的项目
    const allItems = await this.documentRepository.find({
      where: {
        creatorId,
        isDeleted: false,
      },
      order: {
        itemType: 'ASC',
        sortOrder: 'ASC',
        created_time: 'DESC',
      },
    });

    console.log('=== getFolderTree Debug ===');
    console.log('Total items found:', allItems.length);
    console.log('Items breakdown:', {
      folders: allItems.filter((item) => item.itemType === ItemType.FOLDER)
        .length,
      documents: allItems.filter((item) => item.itemType === ItemType.DOCUMENT)
        .length,
      rootLevel: allItems.filter((item) => !item.parentId).length,
    });

    // 构建树形结构
    const itemMap = new Map<
      number,
      FileSystemItemEntity & { children?: FileSystemItemEntity[] }
    >();
    const rootItems: FileSystemItemEntity[] = [];

    // 先将所有项目放入map
    allItems.forEach((item) => {
      // 只给文件夹类型添加children字段，文档类型不需要
      const itemWithChildren =
        item.itemType === ItemType.FOLDER
          ? { ...item, children: [] }
          : { ...item };
      itemMap.set(item.id, itemWithChildren);
    });

    // 构建父子关系
    allItems.forEach((item) => {
      const currentItem = itemMap.get(item.id)!;

      if (item.parentId) {
        // 有父文件夹的项目
        const parent = itemMap.get(item.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentItem);
        } else {
          // 父文件夹不存在，放到根级别
          console.warn(
            `Parent folder ${item.parentId} not found for item ${item.id}, placing at root level`,
          );
          rootItems.push(currentItem);
        }
      } else {
        // 没有父文件夹的项目（包括根级文档和文件夹）
        rootItems.push(currentItem);
      }
    });

    console.log('Root level items:', rootItems.length);
    console.log('Root items breakdown:', {
      folders: rootItems.filter((item) => item.itemType === ItemType.FOLDER)
        .length,
      documents: rootItems.filter((item) => item.itemType === ItemType.DOCUMENT)
        .length,
    });

    return rootItems;
  }

  // 获取文件夹树结构（带搜索过滤功能）
  async getFolderTreeWithFilter(
    creatorId: number,
    query?: QueryDocumentDto,
  ): Promise<FileSystemItemEntity[]> {
    // 构建查询条件
    const qb = this.documentRepository.createQueryBuilder('item');

    qb.where('item.creatorId = :creatorId', { creatorId }).andWhere(
      'item.isDeleted = :isDeleted',
      { isDeleted: false },
    );

    // 搜索过滤
    if (query?.keyword) {
      qb.andWhere('item.name LIKE :keyword', { keyword: `%${query.keyword}%` });
    }

    // 文档类型过滤
    if (query?.type) {
      qb.andWhere('item.documentType = :type', { type: query.type });
    }

    // 可见性过滤
    if (query?.visibility) {
      qb.andWhere('item.visibility = :visibility', {
        visibility: query.visibility,
      });
    }

    qb.orderBy('item.itemType', 'ASC')
      .addOrderBy('item.sortOrder', 'ASC')
      .addOrderBy('item.created_time', 'DESC');

    const filteredItems = await qb.getMany();

    // 如果有搜索条件，需要包含匹配项的所有父文件夹
    let allItems = filteredItems;
    if (query?.keyword || query?.type || query?.visibility) {
      // 获取所有匹配项的父文件夹链
      const parentIds = new Set<number>();

      for (const item of filteredItems) {
        let currentParentId: number | null = item.parentId;
        while (currentParentId) {
          parentIds.add(currentParentId);
          // 查找父文件夹的父文件夹
          const parent = await this.documentRepository.findOne({
            where: { id: currentParentId, creatorId, isDeleted: false },
          });
          currentParentId = parent?.parentId || null;
        }
      }

      // 获取所有需要的父文件夹
      if (parentIds.size > 0) {
        const parentFolders = await this.documentRepository.find({
          where: {
            id: In(Array.from(parentIds)),
            creatorId,
            isDeleted: false,
            itemType: ItemType.FOLDER,
          },
        });

        // 合并结果，去重
        const itemMap = new Map();
        [...filteredItems, ...parentFolders].forEach((item) => {
          itemMap.set(item.id, item);
        });
        allItems = Array.from(itemMap.values());
      }
    }

    console.log('=== getFolderTreeWithFilter Debug ===');
    console.log('Filtered items found:', filteredItems.length);
    console.log('Total items for tree building:', allItems.length);
    console.log('Query filters:', query);

    // 构建树形结构
    const itemMap = new Map<
      number,
      FileSystemItemEntity & { children?: FileSystemItemEntity[] }
    >();
    const rootItems: FileSystemItemEntity[] = [];

    // 先将所有项目放入map
    allItems.forEach((item) => {
      // 只给文件夹类型添加children字段，文档类型不需要
      const itemWithChildren =
        item.itemType === ItemType.FOLDER
          ? { ...item, children: [] }
          : { ...item };
      itemMap.set(item.id, itemWithChildren);
    });

    // 构建父子关系
    allItems.forEach((item) => {
      const currentItem = itemMap.get(item.id)!;

      if (item.parentId) {
        // 有父文件夹的项目
        const parent = itemMap.get(item.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentItem);
        } else {
          // 父文件夹不存在或不在过滤结果中，放到根级别
          rootItems.push(currentItem);
        }
      } else {
        // 没有父文件夹的项目（包括根级文档和文件夹）
        rootItems.push(currentItem);
      }
    });

    console.log('Final root items:', rootItems.length);
    console.log('Root items breakdown:', {
      folders: rootItems.filter((item) => item.itemType === ItemType.FOLDER)
        .length,
      documents: rootItems.filter((item) => item.itemType === ItemType.DOCUMENT)
        .length,
    });

    return rootItems;
  }

  // 获取文件夹路径（面包屑导航）
  async getFolderPath(
    folderId: number,
    creatorId: number,
  ): Promise<{
    currentFolder: FileSystemItemEntity;
    breadcrumbs: FileSystemItemEntity[];
  }> {
    // 首先验证文件夹是否存在且属于当前用户
    const currentFolder = await this.documentRepository.findOne({
      where: {
        id: folderId,
        creatorId,
        isDeleted: false,
        itemType: ItemType.FOLDER,
      },
    });

    if (!currentFolder) {
      throw new HttpException('文件夹不存在或无权限访问', HttpStatus.NOT_FOUND);
    }

    // 构建面包屑路径
    const breadcrumbs: FileSystemItemEntity[] = [];
    let current: FileSystemItemEntity | null = currentFolder;

    // 从当前文件夹开始向上遍历到根目录
    while (current) {
      breadcrumbs.unshift(current);

      if (current.parentId) {
        current = await this.documentRepository.findOne({
          where: {
            id: current.parentId,
            creatorId,
            isDeleted: false,
            itemType: ItemType.FOLDER,
          },
        });
      } else {
        break;
      }
    }

    return {
      currentFolder,
      breadcrumbs,
    };
  }

  // 获取文档路径（面包屑导航）
  async getDocumentPath(
    documentId: number,
    currentUserId?: number,
  ): Promise<{
    currentDocument: FileSystemItemEntity;
    breadcrumbs: FileSystemItemEntity[];
  }> {
    // 首先验证文档是否存在且有权限访问
    const currentDocument = await this.documentRepository.findOne({
      where: {
        id: documentId,
        isDeleted: false,
        itemType: ItemType.DOCUMENT,
      },
    });

    if (!currentDocument) {
      throw new HttpException('文档不存在', HttpStatus.NOT_FOUND);
    }

    // 权限检查
    if (
      currentDocument.visibility === 'private' &&
      currentDocument.creatorId !== currentUserId
    ) {
      throw new HttpException('无权访问此文档', HttpStatus.FORBIDDEN);
    }

    // 构建面包屑路径（只包含文件夹，不包含文档本身）
    const breadcrumbs: FileSystemItemEntity[] = [];
    let currentFolderId: number | null = currentDocument.parentId;

    // 从文档的父文件夹开始向上遍历到根目录
    while (currentFolderId) {
      const folder = await this.documentRepository.findOne({
        where: {
          id: currentFolderId,
          creatorId: currentDocument.creatorId, // 使用文档创建者的ID
          isDeleted: false,
          itemType: ItemType.FOLDER,
        },
      });

      if (folder) {
        breadcrumbs.unshift(folder);
        currentFolderId = folder.parentId;
      } else {
        break;
      }
    }

    return {
      currentDocument,
      breadcrumbs,
    };
  }

  // 批量获取文档（用于Keep-alive标签页预加载）
  async batchGetDocuments(
    ids: number[],
    currentUserId?: number,
  ): Promise<{
    documents: FileSystemItemEntity[];
    notFound: number[];
  }> {
    // 查询所有请求的文档
    const documents = await this.documentRepository.find({
      where: {
        id: In(ids),
        itemType: ItemType.DOCUMENT,
        isDeleted: false,
        // 权限控制：只能获取公开文档或自己的文档
        ...(currentUserId ? {} : { visibility: 'public' }),
      },
      relations: ['creator'],
    });

    // 如果有用户认证，额外过滤权限
    const accessibleDocuments = currentUserId
      ? documents.filter(
          (doc) =>
            doc.visibility === 'public' || doc.creatorId === currentUserId,
        )
      : documents.filter((doc) => doc.visibility === 'public');

    // 找出未找到的文档ID
    const foundIds = accessibleDocuments.map((doc) => doc.id);
    const notFound = ids.filter((id) => !foundIds.includes(id));

    return {
      documents: accessibleDocuments,
      notFound,
    };
  }
}
