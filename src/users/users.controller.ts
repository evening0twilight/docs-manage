import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  RefreshTokenDto,
} from './dto/auth.dto';
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
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册', description: '创建新用户账户' })
  @ApiBody({ type: RegisterDto, description: '用户注册信息' })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: CreatedResponseDto,
  })
  @ApiResponse({ status: 409, description: '用户名或邮箱已存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async register(@Body() registerDto: RegisterDto) {
    const authData = await this.usersService.register(registerDto);
    return new CreatedResponseDto(authData, '用户注册成功');
  }

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
}
