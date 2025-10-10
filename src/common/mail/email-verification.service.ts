import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EmailVerificationCodeEntity } from './email-verification.entity';
import { MailService } from './mail.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectRepository(EmailVerificationCodeEntity)
    private readonly verificationCodeRepo: Repository<EmailVerificationCodeEntity>,
    private readonly mailService: MailService,
  ) {}

  /**
   * 生成6位数字验证码
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 发送验证码
   * @param email 目标邮箱
   * @param type 验证码类型
   * @param ip 发送者IP
   * @returns 成功消息
   */
  async sendVerificationCode(
    email: string,
    type: 'register' | 'reset_password',
    ip: string,
  ): Promise<{ message: string }> {
    // 生成验证码
    const code = this.generateCode();

    // 设置过期时间(10分钟)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 保存到数据库
    const verificationCode = this.verificationCodeRepo.create({
      email,
      code,
      type,
      expiresAt,
    });
    await this.verificationCodeRepo.save(verificationCode);

    // 发送邮件
    try {
      await this.mailService.sendVerificationCode(email, code, type, ip);
      return { message: '验证码已发送,请查收邮件' };
    } catch (error: any) {
      const message: string =
        typeof error?.message === 'string'
          ? error.message
          : '发送验证码失败,请稍后重试';
      const status: number =
        typeof error?.status === 'number'
          ? error.status
          : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(message, status);
    }
  }

  /**
   * 验证验证码
   * @param email 邮箱
   * @param code 验证码
   * @param type 验证码类型
   * @returns 验证结果
   */
  async verifyCode(
    email: string,
    code: string,
    type: 'register' | 'reset_password',
  ): Promise<boolean> {
    // 查找验证码
    const verificationCode = await this.verificationCodeRepo.findOne({
      where: {
        email,
        code,
        type,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!verificationCode) {
      throw new HttpException('验证码不存在或已使用', HttpStatus.BAD_REQUEST);
    }

    // 检查是否过期
    if (new Date() > verificationCode.expiresAt) {
      throw new HttpException(
        '验证码已过期，请重新获取',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 标记为已使用
    verificationCode.isUsed = true;
    verificationCode.usedAt = new Date();
    await this.verificationCodeRepo.save(verificationCode);

    return true;
  }

  /**
   * 获取最近的验证码(用于检查是否可以重新发送)
   * @param email 邮箱
   * @param type 验证码类型
   * @returns 最近的验证码或null
   */
  async getRecentCode(
    email: string,
    type: 'register' | 'reset_password',
  ): Promise<EmailVerificationCodeEntity | null> {
    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

    return this.verificationCodeRepo.findOne({
      where: {
        email,
        type,
        createdAt: LessThan(oneMinuteAgo),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * 清理过期的验证码
   * 每小时执行一次
   */
  @Cron('0 * * * *')
  async cleanExpiredCodes(): Promise<void> {
    const now = new Date();
    const result = await this.verificationCodeRepo.delete({
      expiresAt: LessThan(now),
    });
    console.log(`[EmailVerification] 清理了 ${result.affected} 条过期验证码`);
  }
}
