import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './user.entity';
import { RegisterDto, LoginDto, AuthResponse } from './dto/auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // 注册用户
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { username, password, email } = dto;

    // 检查用户是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new HttpException('用户名或邮箱已存在', HttpStatus.CONFLICT);
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // 生成tokens
    return this.generateTokens(savedUser);
  }

  // 用户登录
  async login(dto: LoginDto): Promise<AuthResponse> {
    const { username, password } = dto;

    // 查找用户
    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }], // 允许用户名或邮箱登录
    });

    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(
      password,
      String(user.password),
    );
    if (!isPasswordValid) {
      throw new HttpException('密码错误', HttpStatus.UNAUTHORIZED);
    }

    // 生成tokens
    return this.generateTokens(user);
  }

  // 刷新token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // 验证refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // 查找用户
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new HttpException(
          'Invalid refresh token',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 生成新的tokens
      return this.generateTokens(user);
    } catch {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  // 注销
  async logout(userId: number): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: undefined });
  }

  // 根据ID查找用户
  async findById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  // 生成双token
  private async generateTokens(user: UserEntity): Promise<AuthResponse> {
    // 生成访问token (15分钟)
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
      },
    );

    // 生成刷新token (7天)
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      },
    );

    // 保存refresh token到数据库
    await this.userRepository.update(user.id, { refreshToken });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }
}
