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
    type: 'register' | 'reset_password' | 'change_email',
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
   * 验证验证码（带尝试次数限制）
   * @param email 邮箱
   * @param code 验证码
   * @param type 验证码类型
   * @returns 验证结果
   */
  async verifyCode(
    email: string,
    code: string,
    type: 'register' | 'reset_password' | 'change_email',
  ): Promise<boolean> {
    console.log(
      `[VerifyCode] 开始验证: email=${email}, code=${code}, type=${type}`,
    );

    // 查找最新的未使用验证码
    const verificationCode = await this.verificationCodeRepo.findOne({
      where: {
        email,
        type,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!verificationCode) {
      console.warn(
        `[VerifyCode] 验证码不存在或已使用: email=${email}, type=${type}`,
      );
      throw new HttpException('验证码不存在或已使用', HttpStatus.BAD_REQUEST);
    }

    console.log(
      `[VerifyCode] 找到验证码: id=${verificationCode.id}, code=${verificationCode.code}, createdAt=${verificationCode.createdAt.toISOString()}, expiresAt=${verificationCode.expiresAt.toISOString()}, isUsed=${verificationCode.isUsed}, verifyAttempts=${verificationCode.verifyAttempts}`,
    );

    // 检查是否过期
    const now = new Date();
    if (now > verificationCode.expiresAt) {
      console.warn(
        `[VerifyCode] 验证码已过期: now=${now.toISOString()}, expiresAt=${verificationCode.expiresAt.toISOString()}`,
      );
      throw new HttpException(
        '验证码已过期，请重新获取',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 检查尝试次数（最多5次）
    if (verificationCode.verifyAttempts >= 5) {
      console.warn(
        `[VerifyCode] 尝试次数已达上限: verifyAttempts=${verificationCode.verifyAttempts}`,
      );
      throw new HttpException(
        '验证码尝试次数已达上限，请重新获取验证码',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 验证码不匹配
    if (verificationCode.code !== code) {
      console.warn(
        `[VerifyCode] 验证码不匹配: expected=${verificationCode.code}, actual=${code}`,
      );
      // 增加尝试次数
      verificationCode.verifyAttempts += 1;
      await this.verificationCodeRepo.save(verificationCode);

      const remainingAttempts = 5 - verificationCode.verifyAttempts;
      if (remainingAttempts > 0) {
        throw new HttpException(
          `验证码错误，还剩 ${remainingAttempts} 次尝试机会`,
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          '验证码尝试次数已达上限，请重新获取验证码',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 验证码正确，标记为已使用
    console.log(`[VerifyCode] 验证码验证成功，标记为已使用: email=${email}`);
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
    type: 'register' | 'reset_password' | 'change_email',
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
