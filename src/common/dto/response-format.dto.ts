import { ApiProperty } from '@nestjs/swagger';

// 基础响应 DTO
export class BaseResponseDto<T = any> {
  @ApiProperty({ description: 'HTTP状态码', example: 200 })
  statusCode: number;

  @ApiProperty({ description: '响应消息', example: '操作成功' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data?: T;

  @ApiProperty({ description: '时间戳', example: '2025-09-23T10:00:00.000Z' })
  timestamp: string;

  constructor(statusCode: number, message: string, data?: T) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

// 成功响应 DTO
export class SuccessResponseDto<T = any> extends BaseResponseDto<T> {
  constructor(data?: T, message: string = '操作成功') {
    super(200, message, data);
  }
}

// 创建成功响应 DTO
export class CreatedResponseDto<T = any> extends BaseResponseDto<T> {
  constructor(data?: T, message: string = '创建成功') {
    super(201, message, data);
  }
}

// 用户信息响应 DTO
export class UserProfileResponseDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'testuser' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'testuser@example.com' })
  email: string;

  @ApiProperty({ description: '创建时间', example: '2025-09-23T10:00:00.000Z' })
  createdAt: Date;
}

// 登出响应 DTO
export class LogoutResponseDto {
  @ApiProperty({ description: '操作结果消息', example: '登出成功' })
  message: string;
}
