import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './user.entity';
import { LoginDto, AuthResponse } from './dto/auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/password.dto';
import { EmailVerificationService } from '../common/mail/email-verification.service';
import { MailService } from '../common/mail/mail.service';
import { UploadService } from '../common/upload/upload.service';
import {
  RegisterWithCodeDto,
  ResetPasswordDto,
  ChangeEmailDto,
} from './dto/email-verification.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailVerificationService: EmailVerificationService,
    private mailService: MailService,
    private uploadService: UploadService,
  ) {}

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

    // 更新最后登录时间
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

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

  // 更新用户信息
  async updateUser(
    userId: number,
    updateDto: UpdateUserDto,
  ): Promise<UserEntity> {
    // 检查用户是否存在
    const user = await this.findById(userId);

    // 如果要更新用户名，检查是否已被占用
    if (updateDto.username && updateDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateDto.username },
      });
      if (existingUser) {
        throw new HttpException('用户名已被占用', HttpStatus.CONFLICT);
      }
    }

    // 如果要更新邮箱，检查是否已被占用
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateDto.email },
      });
      if (existingUser) {
        throw new HttpException('邮箱已被占用', HttpStatus.CONFLICT);
      }
    }

    // 🔥 如果更新头像，删除旧头像文件
    if (updateDto.avatar && updateDto.avatar !== user.avatar) {
      await this.deleteOldAvatar(user.avatar);
    }

    // 更新用户信息
    Object.assign(user, updateDto);
    return await this.userRepository.save(user);
  }

  /**
   * 删除旧头像文件
   * @param avatarUrl 旧头像URL
   */
  private async deleteOldAvatar(
    avatarUrl: string | null | undefined,
  ): Promise<void> {
    // 只删除存储在COS上的头像，不删除默认头像或外部链接
    if (
      avatarUrl &&
      (avatarUrl.includes('myqcloud.com') || avatarUrl.includes('cos.'))
    ) {
      try {
        await this.uploadService.deleteFile(avatarUrl);
        console.log(`[UsersService] 已删除旧头像: ${avatarUrl}`);
      } catch (error) {
        // 删除失败不影响主流程，只记录日志
        console.error(`[UsersService] 删除旧头像失败: ${avatarUrl}`, error);
      }
    }
  }

  // 修改密码
  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    // 检查新密码和确认密码是否一致
    if (newPassword !== confirmPassword) {
      throw new HttpException('新密码和确认密码不一致', HttpStatus.BAD_REQUEST);
    }

    // 检查新密码是否与旧密码相同
    if (currentPassword === newPassword) {
      throw new HttpException(
        '新密码不能与当前密码相同',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 查找用户
    const user = await this.findById(userId);

    // 验证当前密码
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      String(user.password),
    );
    if (!isPasswordValid) {
      throw new HttpException('当前密码错误', HttpStatus.UNAUTHORIZED);
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await this.userRepository.update(userId, { password: hashedPassword });
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
        avatar: user.avatar,
        displayName: user.displayName,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        website: user.website,
        organization: user.organization,
        position: user.position,
      },
    };
  }

  /**
   * 使用验证码注册用户
   * @param dto 注册信息(包含验证码)
   * @returns 认证响应
   */
  async registerWithCode(dto: RegisterWithCodeDto): Promise<AuthResponse> {
    const { username, password, email, code } = dto;

    // 验证验证码
    await this.emailVerificationService.verifyCode(email, code, 'register');

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

  /**
   * 通过邮箱验证码重置密码
   * @param dto 重置密码信息
   * @returns 成功消息
   */
  async resetPasswordWithCode(
    dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { email, code, newPassword } = dto;

    // 验证验证码
    await this.emailVerificationService.verifyCode(
      email,
      code,
      'reset_password',
    );

    // 查找用户
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await this.userRepository.update(user.id, { password: hashedPassword });

    return { message: '密码重置成功' };
  }

  /**
   * 更新用户头像
   * @param userId 用户ID
   * @param avatarUrl 头像URL
   * @returns 更新后的用户信息
   */
  async updateAvatar(userId: number, avatarUrl: string): Promise<UserEntity> {
    await this.userRepository.update(userId, { avatar: avatarUrl });
    return this.findById(userId);
  }

  /**
   * 修改绑定邮箱（增强版：密码验证 + 冷却期 + 通知旧邮箱）
   * @param userId 用户ID
   * @param dto 修改邮箱DTO
   * @returns 更新后的用户信息
   */
  async changeEmail(
    userId: number,
    dto: ChangeEmailDto,
    ipAddress?: string,
  ): Promise<UserEntity> {
    const { currentPassword, newEmail, code } = dto;

    console.log(`[ChangeEmail] 用户 ${userId} 请求修改邮箱到: ${newEmail}`);

    // 1. 获取当前用户信息
    const user = await this.findById(userId);
    const oldEmail = user.email;

    // 2. 检查邮箱修改冷却期（24小时）
    if (user.lastEmailChangedAt) {
      const cooldownHours = 24;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      const timeSinceLastChange =
        Date.now() - user.lastEmailChangedAt.getTime();

      if (timeSinceLastChange < cooldownMs) {
        const remainingHours = Math.ceil(
          (cooldownMs - timeSinceLastChange) / (60 * 60 * 1000),
        );
        console.warn(
          `[ChangeEmail] 用户 ${userId} 在冷却期内尝试修改邮箱，剩余 ${remainingHours} 小时`,
        );
        throw new HttpException(
          `邮箱修改过于频繁，请在 ${remainingHours} 小时后再试`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 3. 验证当前密码（证明是本人操作）
    console.log(`[ChangeEmail] 验证用户 ${userId} 的密码`);
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      String(user.password),
    );
    if (!isPasswordValid) {
      console.warn(`[ChangeEmail] 用户 ${userId} 密码验证失败，拒绝修改邮箱`);
      throw new HttpException('当前密码错误', HttpStatus.UNAUTHORIZED);
    }

    // 4. 检查新邮箱是否与当前邮箱相同
    if (oldEmail === newEmail) {
      console.warn(
        `[ChangeEmail] 用户 ${userId} 尝试设置相同的邮箱: ${newEmail}`,
      );
      throw new HttpException(
        '新邮箱不能与当前邮箱相同',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 5. 检查新邮箱是否已被其他用户占用
    console.log(`[ChangeEmail] 检查邮箱 ${newEmail} 是否已被占用`);
    const existingUser = await this.userRepository.findOne({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      console.warn(
        `[ChangeEmail] 邮箱 ${newEmail} 已被用户 ${existingUser.id} 使用`,
      );
      throw new HttpException('该邮箱已被其他用户使用', HttpStatus.CONFLICT);
    }

    // 6. 验证新邮箱的验证码
    console.log(`[ChangeEmail] 验证邮箱 ${newEmail} 的验证码`);
    try {
      await this.emailVerificationService.verifyCode(
        newEmail,
        code,
        'change_email',
      );
    } catch (error) {
      console.warn(`[ChangeEmail] 用户 ${userId} 验证码验证失败: ${newEmail}`);
      throw error;
    }

    // 7. 更新邮箱和修改时间
    console.log(
      `[ChangeEmail] 更新用户 ${userId} 的邮箱: ${oldEmail} -> ${newEmail}`,
    );
    await this.userRepository.update(userId, {
      email: newEmail,
      lastEmailChangedAt: new Date(),
    });

    // 8. 向旧邮箱发送通知（异步，不阻塞响应）
    this.mailService
      .sendEmailChangeNotification(oldEmail, newEmail, user.username, ipAddress)
      .then(() => {
        console.log(`[ChangeEmail] ✅ 已向旧邮箱 ${oldEmail} 发送变更通知`);
      })
      .catch((error) => {
        console.error(
          `[ChangeEmail] ⚠️ 向旧邮箱 ${oldEmail} 发送通知失败:`,
          error.message,
        );
      });

    console.log(
      `[ChangeEmail] ✅ 用户 ${userId} 邮箱修改成功: ${oldEmail} -> ${newEmail}`,
    );

    return this.findById(userId);
  }
}
