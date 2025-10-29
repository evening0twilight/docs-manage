import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemType, DocumentType } from '../document.entity';

export { ItemType, DocumentType };

export enum DocumentVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  SHARED = 'shared',
}

export class CreateFileSystemItemDto {
  @ApiProperty({
    description: '名称（文件夹名称或文档标题）',
    example: '我的文档',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty({ message: '名称不能为空' })
  @IsString({ message: '名称必须是字符串' })
  @MinLength(1, { message: '名称至少1个字符' })
  @MaxLength(100, { message: '名称最多100个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  name: string;

  @ApiProperty({
    description: '项目类型',
    enum: ItemType,
    example: ItemType.DOCUMENT,
  })
  @IsNotEmpty({ message: '项目类型不能为空' })
  @IsEnum(ItemType, { message: '项目类型必须是 folder 或 document' })
  itemType: ItemType;

  @ApiPropertyOptional({
    description: '父文件夹ID（为空则创建在根目录）',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '父文件夹ID必须是数字' })
  parentId?: number;

  // === 文档相关字段（仅当 itemType = 'document' 时需要） ===
  @ApiPropertyOptional({
    description: '文档内容（仅文档类型需要）',
    example: '这是文档的主要内容...',
  })
  @IsOptional()
  @IsString({ message: '文档内容必须是字符串' })
  content?: string;

  @ApiPropertyOptional({
    description: '文档类型（仅文档类型需要）',
    enum: DocumentType,
    example: DocumentType.TEXT,
  })
  @IsOptional()
  @IsEnum(DocumentType, { message: '文档类型不正确' })
  documentType?: DocumentType;

  @ApiPropertyOptional({
    description: '缩略图URL（仅文档类型需要）',
    example: 'https://example.com/thumb.jpg',
  })
  @IsOptional()
  @IsString({ message: '缩略图URL必须是字符串' })
  filePath?: string;

  @ApiPropertyOptional({
    description: '可见性',
    enum: DocumentVisibility,
    example: DocumentVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(DocumentVisibility, { message: '可见性类型不正确' })
  visibility?: DocumentVisibility;

  @ApiPropertyOptional({
    description: '排序顺序',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '排序顺序必须是数字' })
  sortOrder?: number;
}

// 兼容旧的CreateDocumentDto（保持API向后兼容）
export class CreateDocumentDto {
  @ApiProperty({
    description: '文档标题',
    example: '我的第一个文档',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty({ message: '文档标题不能为空' })
  @IsString({ message: '文档标题必须是字符串' })
  @MinLength(1, { message: '文档标题至少1个字符' })
  @MaxLength(100, { message: '文档标题最多100个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  title: string;

  @ApiPropertyOptional({
    description: '文档内容',
    example: '这是文档的主要内容...',
  })
  @IsOptional()
  @IsString({ message: '文档内容必须是字符串' })
  content?: string;

  @ApiPropertyOptional({
    description: '文档描述',
    example: '这是一个用于测试的文档',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: '文档描述必须是字符串' })
  @MaxLength(500, { message: '描述最多500个字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '文档类型',
    enum: DocumentType,
    example: DocumentType.TEXT,
  })
  @IsOptional()
  @IsEnum(DocumentType, { message: '文档类型不正确' })
  type?: DocumentType;

  @ApiPropertyOptional({
    description: '父文件夹ID（为空则创建在根目录）',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '父文件夹ID必须是数字' })
  parentId?: number;

  @ApiPropertyOptional({
    description: '可见性',
    enum: DocumentVisibility,
    example: DocumentVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(DocumentVisibility, { message: '可见性类型不正确' })
  visibility?: DocumentVisibility;
}

// 创建文件夹的DTO
export class CreateFolderDto {
  @ApiProperty({
    description: '文件夹名称',
    example: '我的文件夹',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty({ message: '文件夹名称不能为空' })
  @IsString({ message: '文件夹名称必须是字符串' })
  @MinLength(1, { message: '文件夹名称至少1个字符' })
  @MaxLength(100, { message: '文件夹名称最多100个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  name: string;

  @ApiPropertyOptional({
    description: '文件夹描述',
    example: '这是一个项目文件夹',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: '文件夹描述必须是字符串' })
  @MaxLength(500, { message: '描述最多500个字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '父文件夹ID（为空则创建在根目录）',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '父文件夹ID必须是数字' })
  parentId?: number;

  @ApiPropertyOptional({
    description: '可见性',
    enum: DocumentVisibility,
    example: DocumentVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(DocumentVisibility, { message: '可见性类型不正确' })
  visibility?: DocumentVisibility;
}
