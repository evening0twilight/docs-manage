import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentPermission,
  PermissionRole,
} from './document-permission.entity';
import { FileSystemItemEntity } from './document.entity';
import { UserEntity } from '../users/user.entity';
import {
  ShareDocumentDto,
  UpdatePermissionDto,
} from './dto/share-document.dto';

@Injectable()
export class DocumentPermissionService {
  constructor(
    @InjectRepository(DocumentPermission)
    private permissionRepository: Repository<DocumentPermission>,
    @InjectRepository(FileSystemItemEntity)
    private documentRepository: Repository<FileSystemItemEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  /**
   * 检查用户是否有权限执行某操作
   */
  async checkPermission(
    userId: number,
    documentId: number,
    action: 'read' | 'write' | 'delete' | 'share',
  ): Promise<boolean> {
    // 1. 检查文档是否存在
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    // 2. 如果是创建者,拥有所有权限
    if (document.creatorId === userId) {
      return true;
    }

    // 3. 查询权限记录
    const permission = await this.permissionRepository.findOne({
      where: {
        documentId: documentId.toString(),
        userId: userId.toString(),
      },
    });

    if (!permission) {
      return false;
    }

    // 4. 根据操作类型检查权限
    switch (action) {
      case 'read':
        return permission.canRead;
      case 'write':
        return permission.canWrite;
      case 'delete':
        return permission.canDelete;
      case 'share':
        return permission.canShare;
      default:
        return false;
    }
  }

  /**
   * 分享文档给用户
   */
  async shareDocument(
    documentId: number,
    shareDto: ShareDocumentDto,
    currentUserId: number,
  ): Promise<DocumentPermission> {
    // 1. 检查当前用户是否有分享权限
    const hasSharePermission = await this.checkPermission(
      currentUserId,
      documentId,
      'share',
    );

    if (!hasSharePermission) {
      throw new ForbiddenException('您没有权限分享此文档');
    }

    // 2. 查找目标用户（通过ID或邮箱）
    let targetUser: UserEntity | null;

    if (shareDto.userIdentifier.includes('@')) {
      // 通过邮箱查找
      targetUser = await this.userRepository.findOne({
        where: { email: shareDto.userIdentifier },
      });
    } else {
      // 通过ID查找
      targetUser = await this.userRepository.findOne({
        where: { id: parseInt(shareDto.userIdentifier) },
      });
    }

    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    // 3. 检查是否已经有权限
    const existingPermission = await this.permissionRepository.findOne({
      where: {
        documentId: documentId.toString(),
        userId: targetUser.id.toString(),
      },
    });

    // 4. 根据角色设置权限
    const permissionData = this.getRolePermissions(shareDto.role);

    // 允许自定义权限覆盖默认权限
    if (shareDto.canRead !== undefined)
      permissionData.canRead = shareDto.canRead;
    if (shareDto.canWrite !== undefined)
      permissionData.canWrite = shareDto.canWrite;
    if (shareDto.canDelete !== undefined)
      permissionData.canDelete = shareDto.canDelete;
    if (shareDto.canShare !== undefined)
      permissionData.canShare = shareDto.canShare;

    if (existingPermission) {
      // 更新现有权限
      Object.assign(existingPermission, {
        role: shareDto.role,
        ...permissionData,
      });
      return await this.permissionRepository.save(existingPermission);
    } else {
      // 创建新权限
      const permission = this.permissionRepository.create({
        documentId: documentId.toString(),
        userId: targetUser.id.toString(),
        role: shareDto.role,
        ...permissionData,
      });
      return await this.permissionRepository.save(permission);
    }
  }

  /**
   * 获取文档的所有权限列表
   */
  async getDocumentPermissions(
    documentId: number,
    currentUserId: number,
  ): Promise<DocumentPermission[]> {
    // 检查是否有读取权限
    const hasPermission = await this.checkPermission(
      currentUserId,
      documentId,
      'read',
    );

    if (!hasPermission) {
      throw new ForbiddenException('您没有权限查看此文档的权限列表');
    }

    return await this.permissionRepository.find({
      where: { documentId: documentId.toString() },
      relations: ['user'],
    });
  }

  /**
   * 更新权限
   */
  async updatePermission(
    permissionId: string,
    updateDto: UpdatePermissionDto,
    currentUserId: number,
  ): Promise<DocumentPermission> {
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('权限记录不存在');
    }

    // 检查是否有分享权限
    const hasSharePermission = await this.checkPermission(
      currentUserId,
      parseInt(permission.documentId),
      'share',
    );

    if (!hasSharePermission) {
      throw new ForbiddenException('您没有权限修改此权限');
    }

    // 如果修改角色，更新对应权限
    if (updateDto.role) {
      const rolePermissions = this.getRolePermissions(updateDto.role);
      Object.assign(permission, { role: updateDto.role, ...rolePermissions });
    }

    // 应用自定义权限
    if (updateDto.canRead !== undefined) permission.canRead = updateDto.canRead;
    if (updateDto.canWrite !== undefined)
      permission.canWrite = updateDto.canWrite;
    if (updateDto.canDelete !== undefined)
      permission.canDelete = updateDto.canDelete;
    if (updateDto.canShare !== undefined)
      permission.canShare = updateDto.canShare;

    return await this.permissionRepository.save(permission);
  }

  /**
   * 删除权限（取消分享）
   */
  async removePermission(
    permissionId: string,
    currentUserId: number,
  ): Promise<void> {
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('权限记录不存在');
    }

    // 检查是否有分享权限
    const hasSharePermission = await this.checkPermission(
      currentUserId,
      parseInt(permission.documentId),
      'share',
    );

    if (!hasSharePermission) {
      throw new ForbiddenException('您没有权限删除此权限');
    }

    // 不允许删除所有者权限
    if (permission.role === PermissionRole.OWNER) {
      throw new BadRequestException('不能删除文档所有者的权限');
    }

    await this.permissionRepository.remove(permission);
  }

  /**
   * 根据角色获取默认权限
   */
  private getRolePermissions(role: PermissionRole) {
    switch (role) {
      case PermissionRole.OWNER:
        return {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canShare: true,
        };
      case PermissionRole.EDITOR:
        return {
          canRead: true,
          canWrite: true,
          canDelete: false,
          canShare: false,
        };
      case PermissionRole.VIEWER:
        return {
          canRead: true,
          canWrite: false,
          canDelete: false,
          canShare: false,
        };
      default:
        return {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canShare: false,
        };
    }
  }

  /**
   * 创建所有者权限（在创建文档时自动调用）
   */
  async createOwnerPermission(
    documentId: number,
    userId: number,
  ): Promise<DocumentPermission> {
    const permission = this.permissionRepository.create({
      documentId: documentId.toString(),
      userId: userId.toString(),
      role: PermissionRole.OWNER,
      canRead: true,
      canWrite: true,
      canDelete: true,
      canShare: true,
    });

    return await this.permissionRepository.save(permission);
  }

  /**
   * 获取用户有权限的所有文档
   */
  async getUserDocuments(userId: number): Promise<FileSystemItemEntity[]> {
    const permissions = await this.permissionRepository.find({
      where: { userId: userId.toString() },
    });

    const documentIds = permissions.map((p) => parseInt(p.documentId));

    if (documentIds.length === 0) {
      return [];
    }

    return await this.documentRepository
      .createQueryBuilder('doc')
      .where('doc.id IN (:...ids)', { ids: documentIds })
      .andWhere('doc.isDeleted = false')
      .getMany();
  }
}
