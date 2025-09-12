import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AuthDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}

export class RegisterDto extends AuthDto {
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.toLowerCase().trim() : value;
  })
  email: string;

  @IsOptional()
  @IsString({ message: '姓名必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  name?: string;
}

export class LoginDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  @Transform(({ value }: { value: string }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}

export class RefreshTokenDto {
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  @IsString({ message: '刷新令牌必须是字符串' })
  refreshToken: string;
}

export interface AuthResponse {
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
