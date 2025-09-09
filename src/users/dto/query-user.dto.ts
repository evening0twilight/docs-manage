import {
  IsOptional,
  IsString,
  IsEmail,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryUserDto {
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  keyword?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.toLowerCase().trim() : value;
  })
  email?: string;

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
}
