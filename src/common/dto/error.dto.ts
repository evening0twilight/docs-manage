import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class ErrorResponseDto {
  @IsNumber({}, { message: '状态码必须是数字' })
  statusCode: number;

  @IsString({ message: '错误消息必须是字符串' })
  message: string;

  @IsOptional()
  @IsString({ message: '错误类型必须是字符串' })
  error?: string;

  @IsOptional()
  @IsArray({ message: '详细信息必须是数组' })
  details?: string[];

  @IsString({ message: '时间戳必须是字符串' })
  timestamp: string;

  @IsString({ message: '路径必须是字符串' })
  path: string;
}
