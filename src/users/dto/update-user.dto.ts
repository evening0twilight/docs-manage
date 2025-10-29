import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(2, { message: '用户名至少2个字符' })
  @MaxLength(20, { message: '用户名最多20个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.toLowerCase().trim() : value;
  })
  email?: string;

  @IsOptional()
  @IsString({ message: '昵称必须是字符串' })
  @MaxLength(100, { message: '昵称最多100个字符' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  displayName?: string;

  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @MaxLength(20, { message: '手机号最多20个字符' })
  phone?: string;

  @IsOptional()
  @IsString({ message: '个人简介必须是字符串' })
  @MaxLength(500, { message: '个人简介最多500个字符' })
  bio?: string;

  @IsOptional()
  @IsString({ message: '所在地必须是字符串' })
  @MaxLength(100, { message: '所在地最多100个字符' })
  location?: string;

  @IsOptional()
  @IsUrl({}, { message: '个人网站格式不正确' })
  @MaxLength(200, { message: '网站地址最多200个字符' })
  website?: string;

  @IsOptional()
  @IsString({ message: '公司/组织必须是字符串' })
  @MaxLength(100, { message: '公司/组织最多100个字符' })
  organization?: string;

  @IsOptional()
  @IsString({ message: '职位必须是字符串' })
  @MaxLength(100, { message: '职位最多100个字符' })
  position?: string;
}
