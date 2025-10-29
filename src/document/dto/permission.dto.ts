import { IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

export class DocumentPermissionDto {
  @IsNotEmpty({ message: '文档ID不能为空' })
  @IsNumber({}, { message: '文档ID必须是数字' })
  @Type(() => Number)
  documentId: number;

  @IsNotEmpty({ message: '用户ID不能为空' })
  @IsNumber({}, { message: '用户ID必须是数字' })
  @Type(() => Number)
  userId: number;

  @IsNotEmpty({ message: '权限类型不能为空' })
  @IsEnum(PermissionType, { message: '权限类型无效' })
  permission: PermissionType;
}

export class ShareDocumentDto {
  @IsNotEmpty({ message: '用户ID不能为空' })
  @IsNumber({}, { message: '用户ID必须是数字' })
  @Type(() => Number)
  userId: number;

  @IsOptional()
  @IsEnum(PermissionType, { message: '权限类型无效' })
  permission?: PermissionType = PermissionType.READ;
}
