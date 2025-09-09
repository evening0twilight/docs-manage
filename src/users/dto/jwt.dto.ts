import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class JwtPayloadDto {
  @IsNotEmpty({ message: '用户ID不能为空' })
  @IsNumber({}, { message: '用户ID必须是数字' })
  sub: number;

  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  username: string;

  @IsOptional()
  @IsString({ message: '邮箱必须是字符串' })
  email?: string;

  @IsOptional()
  @IsNumber({}, { message: 'iat必须是数字' })
  iat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'exp必须是数字' })
  exp?: number;
}

export class TokenResponseDto {
  @IsNotEmpty({ message: 'access_token不能为空' })
  @IsString({ message: 'access_token必须是字符串' })
  access_token: string;

  @IsNotEmpty({ message: 'token_type不能为空' })
  @IsString({ message: 'token_type必须是字符串' })
  token_type: string;

  @IsNotEmpty({ message: 'expires_in不能为空' })
  @IsNumber({}, { message: 'expires_in必须是数字' })
  expires_in: number;
}
