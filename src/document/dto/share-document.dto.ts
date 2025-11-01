import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PermissionRole } from '../document-permission.entity';

export class ShareDocumentDto {
  @ApiProperty({
    description: '分享给的用户 ID 或邮箱',
    example: 'user-uuid-123 或 user@example.com',
  })
  @IsString()
  userIdentifier: string; // 可以是 userId 或 email

  @ApiProperty({
    description: '权限角色',
    enum: PermissionRole,
    example: PermissionRole.EDITOR,
  })
  @IsEnum(PermissionRole)
  role: PermissionRole;

  @ApiProperty({
    description: '是否可以读取',
    example: true,
    required: false,
  })
  @IsOptional()
  canRead?: boolean;

  @ApiProperty({
    description: '是否可以写入',
    example: true,
    required: false,
  })
  @IsOptional()
  canWrite?: boolean;

  @ApiProperty({
    description: '是否可以删除',
    example: false,
    required: false,
  })
  @IsOptional()
  canDelete?: boolean;

  @ApiProperty({
    description: '是否可以分享',
    example: false,
    required: false,
  })
  @IsOptional()
  canShare?: boolean;
}

export class UpdatePermissionDto {
  @ApiProperty({
    description: '权限角色',
    enum: PermissionRole,
    example: PermissionRole.EDITOR,
    required: false,
  })
  @IsOptional()
  @IsEnum(PermissionRole)
  role?: PermissionRole;

  @ApiProperty({ description: '是否可以读取', required: false })
  @IsOptional()
  canRead?: boolean;

  @ApiProperty({ description: '是否可以写入', required: false })
  @IsOptional()
  canWrite?: boolean;

  @ApiProperty({ description: '是否可以删除', required: false })
  @IsOptional()
  canDelete?: boolean;

  @ApiProperty({ description: '是否可以分享', required: false })
  @IsOptional()
  canShare?: boolean;
}

export class GenerateShareLinkDto {
  @ApiProperty({
    description: '分享链接的权限角色',
    enum: PermissionRole,
    example: PermissionRole.VIEWER,
  })
  @IsEnum(PermissionRole)
  role: PermissionRole;

  @ApiProperty({
    description: '分享链接的过期时间（小时），不填则永久有效',
    example: 24,
    required: false,
  })
  @IsOptional()
  expiresInHours?: number;
}
