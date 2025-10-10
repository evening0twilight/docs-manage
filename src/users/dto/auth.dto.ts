import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthDto {
  @ApiProperty({
    description: '用户名',
    example: 'testuser',
    minLength: 1,
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  username: string;

  @ApiProperty({
    description: '密码',
    example: 'TestUser123',
    minLength: 6,
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}

/**
 * @deprecated 此 DTO 已废弃，请使用 RegisterWithCodeDto 进行邮箱验证注册
 * 保留此类仅用于类型兼容性
 */
export class RegisterDto extends AuthDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'testuser@example.com',
    format: 'email',
  })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.toLowerCase().trim() : value;
  })
  email: string;

  @ApiPropertyOptional({
    description: '用户姓名',
    example: '张三',
  })
  @IsOptional()
  @IsString({ message: '姓名必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  name?: string;
}

export class LoginDto {
  @ApiProperty({
    description: '用户名',
    example: 'testuser',
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  username: string;

  @ApiProperty({
    description: '密码',
    example: 'TestUser123',
    minLength: 6,
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  @IsString({ message: '刷新令牌必须是字符串' })
  refreshToken: string;
}

export class UserResponseDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'testuser' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'testuser@example.com' })
  email: string;
}

export class AuthResponse {
  @ApiProperty({
    description: '访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({ description: '用户信息', type: UserResponseDto })
  user: UserResponseDto;
}

export interface AuthResponseInterface {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export interface TokenPayload {
  sub: number;
  username: string;
  email: string;
}
