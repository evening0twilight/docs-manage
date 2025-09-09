import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum DocumentType {
  TEXT = 'text',
  IMAGE = 'image',
  PDF = 'pdf',
  WORD = 'word',
  EXCEL = 'excel',
  OTHER = 'other',
}

export class CreateDocumentDto {
  @IsNotEmpty({ message: '文档标题不能为空' })
  @IsString({ message: '文档标题必须是字符串' })
  @MinLength(1, { message: '文档标题至少1个字符' })
  @MaxLength(100, { message: '文档标题最多100个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  title: string;

  @IsOptional()
  @IsString({ message: '文档内容必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  content?: string;

  @IsOptional()
  @IsString({ message: '文档描述必须是字符串' })
  @MaxLength(500, { message: '文档描述最多500个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  description?: string;

  @IsOptional()
  @IsEnum(DocumentType, { message: '文档类型无效' })
  type?: DocumentType;

  @IsOptional()
  @IsString({ message: '文件路径必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  filePath?: string;

  @IsOptional()
  @IsNumber({}, { message: '文件大小必须是数字' })
  @Type(() => Number)
  fileSize?: number;

  @IsOptional()
  @IsNumber({}, { message: '创建者ID必须是数字' })
  @Type(() => Number)
  createdBy?: number;
}
