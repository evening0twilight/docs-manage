import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsSelect } from 'typeorm';
import { FileSystemItemEntity, ItemType } from './document.entity';
import { QueryDocumentDto } from './dto/query-document.dto';

/**
 * 树/目录列表渲染所需的元信息列白名单。
 * 刻意排除 content(文档全文 TEXT)、description、author、thumb_url 等大/无关字段——
 * 树接口会一次性返回用户所有项目,带上 content 会让响应体随文档数线性膨胀。
 */
const TREE_META_SELECT: FindOptionsSelect<FileSystemItemEntity> = {
  id: true,
  name: true,
  itemType: true,
  documentType: true,
  parentId: true,
  sortOrder: true,
  creatorId: true,
  visibility: true,
  isDeleted: true,
  isCollaborationEnabled: true,
  created_time: true,
  updated_time: true,
};

/**
 * 文件系统层级服务
 *
 * 负责文件夹树、面包屑路径、目录内容等只读层级查询。
 * 从原 DocumentService(上帝类)中抽离,职责单一、便于测试与维护。
 */
@Injectable()
export class DocumentHierarchyService {
  constructor(
    @InjectRepository(FileSystemItemEntity)
    private readonly documentRepository: Repository<FileSystemItemEntity>,
  ) {}

  /**
   * 由扁平的文件系统项目列表构建树形结构
   * (文件夹挂载 children;父项缺失的孤儿项归到根级)
   */
  private buildHierarchyTree(
    allItems: FileSystemItemEntity[],
  ): FileSystemItemEntity[] {
    const itemMap = new Map<
      number,
      FileSystemItemEntity & { children?: FileSystemItemEntity[] }
    >();
    const rootItems: FileSystemItemEntity[] = [];

    // 先将所有项目放入 map(只给文件夹添加 children 字段)
    allItems.forEach((item) => {
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
        const parent = itemMap.get(item.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentItem);
        } else {
          // 父文件夹不存在或不在结果集中,放到根级别
          rootItems.push(currentItem);
        }
      } else {
        rootItems.push(currentItem);
      }
    });

    return rootItems;
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
      select: TREE_META_SELECT, // 只取元信息列,不返回 content 等大字段
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
      select: TREE_META_SELECT, // 只取元信息列,树接口不返回各文档的 content 全文
      order: {
        itemType: 'ASC',
        sortOrder: 'ASC',
        created_time: 'DESC',
      },
    });

    // 构建树形结构
    return this.buildHierarchyTree(allItems);
  }

  // 获取文件夹树结构（带搜索过滤功能）
  async getFolderTreeWithFilter(
    creatorId: number,
    query?: QueryDocumentDto,
  ): Promise<FileSystemItemEntity[]> {
    // 构建查询条件
    const qb = this.documentRepository.createQueryBuilder('item');

    // 只取树渲染所需的元信息列,不返回各文档的 content 全文(树会返回用户全部项目)
    qb.select(Object.keys(TREE_META_SELECT).map((k) => `item.${k}`));

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
          // 查找父文件夹的父文件夹(仅需 parentId 做向上回溯)
          const parent = await this.documentRepository.findOne({
            where: { id: currentParentId, creatorId, isDeleted: false },
            select: { id: true, parentId: true },
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
          select: TREE_META_SELECT, // 与 qb 一致,不取 content 等大字段
        });

        // 合并结果，去重
        const itemMap = new Map();
        [...filteredItems, ...parentFolders].forEach((item) => {
          itemMap.set(item.id, item);
        });
        allItems = Array.from(itemMap.values());
      }
    }

    // 构建树形结构(与 getFolderTree 共用,避免重复逻辑)
    return this.buildHierarchyTree(allItems);
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
}
