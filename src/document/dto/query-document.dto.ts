import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DocumentType, DocumentVisibility } from './create-document.dto';

export class QueryDocumentDto {
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  keyword?: string;

  @IsOptional()
  @IsEnum(DocumentType, { message: '文档类型无效' })
  type?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentVisibility, { message: '文档可见性无效' })
  visibility?: DocumentVisibility;

  @IsOptional()
  @IsNumber({}, { message: '页码必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  @IsOptional()
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Type(() => Number)
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  limit?: number = 10;

  @IsOptional()
  @IsNumber({}, { message: '创建者ID必须是数字' })
  @Type(() => Number)
  creatorId?: number;

  // 是否只查询自己创建的文档
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  onlyMine?: boolean;
}
