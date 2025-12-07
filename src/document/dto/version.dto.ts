import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 保存版本DTO
 */
export class SaveVersionDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  changeDescription?: string;

  @IsOptional()
  @IsBoolean()
  isAutoSave?: boolean;
}

/**
 * 查询版本列表DTO
 */
export class QueryVersionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;
}

/**
 * 恢复版本DTO
 */
export class RestoreVersionDto {
  @IsNumber()
  @Type(() => Number)
  versionId: number;
}

/**
 * 清理旧版本DTO
 */
export class CleanVersionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  keepDays?: number = 30;
}

/**
 * 版本对比DTO
 */
export class CompareVersionDto {
  @IsNumber()
  @Type(() => Number)
  sourceVersionId: number;

  @IsNumber()
  @Type(() => Number)
  targetVersionId: number;
}
