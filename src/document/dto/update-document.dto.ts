import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../document.entity';
import { Type } from 'class-transformer';

// 智能统一更新DTO - 支持文件夹和文档的统一更新
export class UpdateFileSystemItemDto {
  @ApiPropertyOptional({
    description: '文件夹名称（仅用于文件夹更新）',
    example: '我的新文件夹',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '文件夹名称必须是字符串' })
  @MinLength(1, { message: '文件夹名称不能为空' })
  @MaxLength(100, { message: '文件夹名称长度不能超过100个字符' })
  name?: string;

  @ApiPropertyOptional({
    description: '文档标题（仅用于文档更新）',
    example: '更新后的文档标题',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(100, { message: '标题长度不能超过100个字符' })
  title?: string;

  @ApiPropertyOptional({
    description: '文档内容（仅用于文档更新）',
    example: '这里是更新后的文档内容...',
  })
  @IsOptional()
  @IsString({ message: '内容必须是字符串' })
  content?: string;

  @ApiPropertyOptional({
    description: '文档类型（仅用于文档更新）',
    enum: DocumentType,
    example: DocumentType.TEXT,
  })
  @IsOptional()
  @IsEnum(DocumentType, { message: '文档类型无效' })
  type?: DocumentType;

  @ApiPropertyOptional({
    description: '父文件夹ID（移动到其他文件夹时使用，null表示移动到根目录）',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: '父文件夹ID必须是数字' })
  @Type(() => Number)
  parentId?: number;
}

// 保持向后兼容的原始DTO
export class UpdateDocumentDto {
  @ApiPropertyOptional({
    description: '文档标题',
    example: '更新后的文档标题',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(100, { message: '标题长度不能超过100个字符' })
  title?: string;

  @ApiPropertyOptional({
    description: '文档内容',
    example: '这里是更新后的文档内容...',
  })
  @IsOptional()
  @IsString({ message: '内容必须是字符串' })
  content?: string;

  @ApiPropertyOptional({
    description: '文档类型',
    enum: DocumentType,
    example: DocumentType.TEXT,
  })
  @IsOptional()
  @IsEnum(DocumentType, { message: '文档类型无效' })
  type?: DocumentType;

  @ApiPropertyOptional({
    description: '父文件夹ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: '父文件夹ID必须是数字' })
  @Type(() => Number)
  parentId?: number;
}
