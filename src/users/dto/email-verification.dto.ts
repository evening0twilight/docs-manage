import { IsEmail, IsEnum, IsString, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendVerificationCodeDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '验证码类型',
    enum: ['register', 'reset_password', 'change_email'],
    example: 'register',
  })
  @IsEnum(['register', 'reset_password', 'change_email'], {
    message: '验证码类型必须是 register、reset_password 或 change_email',
  })
  type: 'register' | 'reset_password' | 'change_email';
}

export class VerifyCodeDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '6位数字验证码',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  code: string;

  @ApiProperty({
    description: '验证码类型',
    enum: ['register', 'reset_password', 'change_email'],
    example: 'register',
  })
  @IsEnum(['register', 'reset_password', 'change_email'], {
    message: '验证码类型必须是 register、reset_password 或 change_email',
  })
  type: 'register' | 'reset_password' | 'change_email';
}

export class RegisterWithCodeDto {
  @ApiProperty({
    description: '用户名',
    example: 'john_doe',
  })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(3, 20, { message: '用户名长度必须在3-20个字符之间' })
  username: string;

  @ApiProperty({
    description: '密码',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 50, { message: '密码长度必须在6-50个字符之间' })
  password: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '6位数字验证码',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  code: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '6位数字验证码',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  code: string;

  @ApiProperty({
    description: '新密码',
    example: 'NewPassword123!',
  })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @Length(6, 50, { message: '密码长度必须在6-50个字符之间' })
  newPassword: string;
}

export class ChangeEmailDto {
  @ApiProperty({
    description: '新邮箱地址',
    example: 'newemail@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  newEmail: string;

  @ApiProperty({
    description: '6位数字验证码',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  code: string;
}
