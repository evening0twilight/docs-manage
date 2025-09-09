import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UploadDocumentDto {
  @IsNotEmpty({ message: '文件名不能为空' })
  @IsString({ message: '文件名必须是字符串' })
  @MaxLength(255, { message: '文件名最多255个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  filename: string;

  @IsOptional()
  @IsString({ message: '文档标题必须是字符串' })
  @MaxLength(100, { message: '文档标题最多100个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  title?: string;

  @IsOptional()
  @IsString({ message: '文档描述必须是字符串' })
  @MaxLength(500, { message: '文档描述最多500个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  description?: string;

  @IsOptional()
  @IsString({ message: 'MIME类型必须是字符串' })
  mimeType?: string;

  @IsOptional()
  @IsNumber({}, { message: '文件大小必须是数字' })
  @Type(() => Number)
  size?: number;
}
