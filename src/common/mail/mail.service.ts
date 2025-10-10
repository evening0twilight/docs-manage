import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { MailConfig } from './mail.config';
import { MailQuotaService } from './mail-quota.service';
import { MailRateLimitService } from './mail-rate-limit.service';
import {
  getVerificationCodeTemplate,
  VerificationCodeTemplateData,
} from './templates/verification-code.template';
import {
  getResetPasswordTemplate,
  ResetPasswordTemplateData,
} from './templates/reset-password.template';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ipAddress?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private qqTransporter: Transporter;
  private _163Transporter: Transporter;
  private mailConfig: MailConfig;

  constructor(
    private configService: ConfigService,
    private quotaService: MailQuotaService,
    private rateLimitService: MailRateLimitService,
  ) {
    this.mailConfig = new MailConfig(configService);
    this.initializeTransporters();
  }

  /**
   * 初始化邮件传输器
   */
  private initializeTransporters(): void {
    // 验证配置
    const validation = this.mailConfig.validate();
    if (!validation.valid) {
      this.logger.error('邮件配置无效:', validation.errors);
      throw new Error(`邮件配置错误: ${validation.errors.join(', ')}`);
    }

    // QQ邮箱传输器
    this.qqTransporter = nodemailer.createTransport({
      host: this.mailConfig.qq.host,
      port: this.mailConfig.qq.port,
      secure: this.mailConfig.qq.secure,
      auth: {
        user: this.mailConfig.qq.user,
        pass: this.mailConfig.qq.password,
      },
    });

    // 163邮箱传输器
    this._163Transporter = nodemailer.createTransport({
      host: this.mailConfig._163.host,
      port: this.mailConfig._163.port,
      secure: this.mailConfig._163.secure,
      auth: {
        user: this.mailConfig._163.user,
        pass: this.mailConfig._163.password,
      },
    });

    this.logger.log('邮件服务初始化成功');
  }

  /**
   * 发送验证码邮件
   */
  async sendVerificationCode(
    email: string,
    code: string,
    purpose: 'register' | 'reset_password' | 'change_email',
    ipAddress?: string,
  ): Promise<void> {
    const templateData: VerificationCodeTemplateData = {
      code,
      expiresIn: Number(this.configService.get('EMAIL_CODE_EXPIRES', 10)),
      purpose,
    };

    const { subject, html, text } = getVerificationCodeTemplate(templateData);

    await this.sendMail({
      to: email,
      subject,
      html,
      text,
      ipAddress,
    });
  }

  /**
   * 发送重置密码邮件
   */
  async sendResetPasswordEmail(
    email: string,
    username: string,
    resetToken: string,
    ipAddress?: string,
  ): Promise<void> {
    const frontendUrl = this.mailConfig.frontendUrl;
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const templateData: ResetPasswordTemplateData = {
      username,
      resetLink,
      expiresIn: Number(this.configService.get('RESET_TOKEN_EXPIRES', 30)),
      ipAddress,
    };

    const { subject, html, text } = getResetPasswordTemplate(templateData);

    await this.sendMail({
      to: email,
      subject,
      html,
      text,
      ipAddress,
    });
  }

  /**
   * 发送邮件的核心方法
   */
  async sendMail(options: SendMailOptions): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. 限流检查
      await this.checkRateLimits(options.to, options.ipAddress);

      // 2. 选择邮件提供商
      const provider = await this.selectProvider(options.to);

      // 3. 检查配额
      const quotaCheck = await this.quotaService.canSendMail(provider);
      if (!quotaCheck.allowed) {
        throw new HttpException(
          quotaCheck.reason || '配额不足',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 4. 发送邮件
      await this.sendWithProvider(provider, options);

      // 5. 记录成功
      const responseTime = Date.now() - startTime;
      await this.quotaService.recordSent(
        provider,
        options.to,
        'verification',
        'success',
        {
          subject: options.subject,
          ipAddress: options.ipAddress,
          responseTime,
        },
      );

      this.logger.log(
        `邮件发送成功: ${provider} -> ${options.to} (${responseTime}ms)`,
      );
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`邮件发送失败: ${options.to}`, error);

      // 如果有provider信息,记录失败
      if (
        error?.provider &&
        (error.provider === 'qq' || error.provider === '163')
      ) {
        await this.quotaService.recordSent(
          error.provider as 'qq' | '163',
          options.to,
          'verification',
          'failed',
          {
            subject: options.subject,
            errorMessage: error.message,
            ipAddress: options.ipAddress,
            responseTime,
          },
        );
      }

      throw error;
    }
  }

  /**
   * 智能选择邮件提供商
   */
  private async selectProvider(recipientEmail: string): Promise<'qq' | '163'> {
    const allQuota = await this.quotaService.getAllQuotaStatus();

    // 策略1: 如果配置为固定提供商
    if (this.mailConfig.strategy === 'qq') {
      if (allQuota.qq.status === 'exhausted') {
        throw new HttpException(
          'QQ邮箱配额已用完,请明日再试',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return 'qq';
    }

    if (this.mailConfig.strategy === '163') {
      if (allQuota._163.status === 'exhausted') {
        throw new HttpException(
          '163邮箱配额已用完,请明日再试',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return '163';
    }

    // 策略2: 智能路由
    const domain = recipientEmail.split('@')[1]?.toLowerCase();

    // QQ邮箱用户 -> 优先用163发送
    if (domain === 'qq.com' || domain === 'foxmail.com') {
      if (allQuota._163.status !== 'exhausted') {
        return '163';
      }
      if (allQuota.qq.status !== 'exhausted') {
        return 'qq';
      }
    }

    // 163/126邮箱用户 -> 优先用QQ发送
    if (domain === '163.com' || domain === '126.com' || domain === 'yeah.net') {
      if (allQuota.qq.status !== 'exhausted') {
        return 'qq';
      }
      if (allQuota._163.status !== 'exhausted') {
        return '163';
      }
    }

    // 其他邮箱 -> 选择配额余量多的
    if (allQuota.qq.remaining >= allQuota._163.remaining) {
      if (allQuota.qq.status !== 'exhausted') {
        return 'qq';
      }
    } else {
      if (allQuota._163.status !== 'exhausted') {
        return '163';
      }
    }

    // 两个都用完了
    throw new HttpException(
      '当日邮件配额已满,请明日再试',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * 使用指定提供商发送邮件
   */
  private async sendWithProvider(
    provider: 'qq' | '163',
    options: SendMailOptions,
  ): Promise<void> {
    const transporter =
      provider === 'qq' ? this.qqTransporter : this._163Transporter;
    const from =
      provider === 'qq' ? this.mailConfig.qq.from : this.mailConfig._163.from;

    const mailOptions = {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      error.provider = provider; // 附加provider信息用于日志记录
      throw error;
    }
  }

  /**
   * 限流检查
   */
  private async checkRateLimits(
    email: string,
    ipAddress?: string,
  ): Promise<void> {
    // 检查IP限制
    if (ipAddress) {
      const ipCheck = await this.rateLimitService.checkIpDailyLimit(ipAddress);
      if (!ipCheck.allowed) {
        throw new HttpException(
          ipCheck.reason || 'IP限流',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await this.rateLimitService.recordRateLimit(ipAddress, 'ip_daily');
    }

    // 检查邮箱限制
    const emailCheck = await this.rateLimitService.checkEmailHourlyLimit(email);
    if (!emailCheck.allowed) {
      throw new HttpException(
        emailCheck.reason || '邮箱限流',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.rateLimitService.recordRateLimit(email, 'email_hourly');

    // 检查同一操作限制(60秒冷却)
    const operationKey = `${email}_send`;
    const operationCheck = await this.rateLimitService.checkSameOperationLimit(
      operationKey,
      'send_mail',
    );
    if (!operationCheck.allowed) {
      throw new HttpException(
        operationCheck.reason || '操作过于频繁',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.rateLimitService.recordRateLimit(
      operationKey,
      'same_operation',
      'send_mail',
    );
  }

  /**
   * 获取配额状态
   */
  async getQuotaStatus(): Promise<any> {
    return await this.quotaService.getAllQuotaStatus();
  }

  /**
   * 获取发送统计
   */
  async getStats(days: number = 7): Promise<any> {
    return await this.quotaService.getStats(days);
  }
}
