import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UseGuards,
  Get,
  Request,
  Put,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { LoginDto, AuthResponse, RefreshTokenDto } from './dto/auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/password.dto';
import {
  SendVerificationCodeDto,
  RegisterWithCodeDto,
  ResetPasswordDto,
} from './dto/email-verification.dto';
import { EmailVerificationService } from '../common/mail/email-verification.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  CreatedResponseDto,
  SuccessResponseDto,
  UserProfileResponseDto,
  LogoutResponseDto,
} from '../common/dto/response-format.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录', description: '使用用户名和密码登录' })
  @ApiBody({ type: LoginDto, description: '用户登录信息' })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 401, description: '密码错误' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async login(@Body() loginDto: LoginDto) {
    const authData = await this.usersService.login(loginDto);
    return new SuccessResponseDto(authData, '登录成功');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新令牌',
    description: '使用刷新令牌获取新的访问令牌',
  })
  @ApiBody({ type: RefreshTokenDto, description: '刷新令牌' })
  @ApiResponse({
    status: 200,
    description: '令牌刷新成功',
    type: AuthResponse,
  })
  @ApiResponse({ status: 401, description: '无效的刷新令牌' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponse> {
    return this.usersService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '用户登出',
    description: '登出当前用户，使令牌失效。需要在Header中传入Bearer Token。',
  })
  @ApiResponse({
    status: 200,
    description: '登出成功',
    type: LogoutResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async logout(@Request() req: any) {
    await this.usersService.logout(Number(req.user.sub));
    return new SuccessResponseDto({ message: '登出成功' }, '用户登出成功');
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取用户信息',
    description:
      '获取当前登录用户的详细信息。通过JWT Token自动识别用户身份，无需传入用户ID。',
  })
  @ApiResponse({
    status: 200,
    description: '获取用户信息成功',
    type: UserProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findById(Number(req.user.sub));
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    };
    return new SuccessResponseDto(userData, '获取用户信息成功');
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新用户信息',
    description:
      '更新当前登录用户的信息。可以更新用户名、邮箱等信息。通过JWT Token自动识别用户身份。',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: '需要更新的用户信息',
  })
  @ApiResponse({
    status: 200,
    description: '更新用户信息成功',
    type: UserProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 409, description: '用户名或邮箱已被占用' })
  async updateProfile(@Request() req: any, @Body() updateDto: UpdateUserDto) {
    const userId = Number(req.user.sub);
    const updatedUser = await this.usersService.updateUser(userId, updateDto);
    const userData = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
    };
    return new SuccessResponseDto(userData, '更新用户信息成功');
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '修改密码',
    description:
      '修改当前登录用户的密码。需要提供当前密码、新密码和确认密码。通过JWT Token自动识别用户身份。',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: '密码修改信息',
  })
  @ApiResponse({
    status: 200,
    description: '密码修改成功',
  })
  @ApiResponse({ status: 401, description: '未授权访问或当前密码错误' })
  @ApiResponse({ status: 400, description: '新密码和确认密码不一致' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = Number(req.user.sub);
    await this.usersService.changePassword(userId, changePasswordDto);
    return new SuccessResponseDto({}, '密码修改成功');
  }

  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送验证码',
    description: '发送邮箱验证码(注册或重置密码)',
  })
  @ApiBody({ type: SendVerificationCodeDto })
  @ApiResponse({ status: 200, description: '验证码已发送' })
  @ApiResponse({ status: 429, description: '发送频率过高,请稍后再试' })
  @ApiResponse({ status: 503, description: '邮件发送配额已用尽' })
  async sendVerificationCode(
    @Body() dto: SendVerificationCodeDto,
    @Ip() ip: string,
  ) {
    const result = await this.emailVerificationService.sendVerificationCode(
      dto.email,
      dto.type,
      ip,
    );
    return new SuccessResponseDto(result, '验证码已发送');
  }

  @Post('register-with-code')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '使用验证码注册',
    description: '通过邮箱验证码完成用户注册',
  })
  @ApiBody({ type: RegisterWithCodeDto })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: CreatedResponseDto,
  })
  @ApiResponse({ status: 400, description: '验证码无效或已过期' })
  @ApiResponse({ status: 409, description: '用户名或邮箱已存在' })
  async registerWithCode(@Body() dto: RegisterWithCodeDto) {
    const authData = await this.usersService.registerWithCode(dto);
    return new CreatedResponseDto(authData, '用户注册成功');
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '重置密码',
    description: '通过邮箱验证码重置密码',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: '密码重置成功' })
  @ApiResponse({ status: 400, description: '验证码无效或已过期' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.usersService.resetPasswordWithCode(dto);
    return new SuccessResponseDto(result, '密码重置成功');
  }
}
