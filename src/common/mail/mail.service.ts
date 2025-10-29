import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Resend } from 'resend';
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
  private resendClient: Resend | null = null;
  private mailProvider: 'smtp' | 'resend';

  constructor(
    private configService: ConfigService,
    private quotaService: MailQuotaService,
    private rateLimitService: MailRateLimitService,
  ) {
    this.mailConfig = new MailConfig(configService);
    this.mailProvider = (this.configService.get<string>('MAIL_PROVIDER') ||
      'smtp') as 'smtp' | 'resend';
    this.initializeTransporters();
  }

  /**
   * 初始化邮件传输器
   */
  private initializeTransporters(): void {
    if (this.mailProvider === 'resend') {
      // 初始化 Resend 客户端
      const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY 未配置');
      }
      this.resendClient = new Resend(resendApiKey);
      this.logger.log('Resend 邮件服务初始化成功');
      return;
    }

    // SMTP 模式:验证配置
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
      connectionTimeout: 30000, // 30秒连接超时
      greetingTimeout: 30000, // 30秒握手超时
      socketTimeout: 60000, // 60秒数据传输超时
      pool: true, // 使用连接池
      maxConnections: 5, // 最大连接数
      maxMessages: 10, // 每个连接最多发送消息数
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
      connectionTimeout: 30000, // 30秒连接超时
      greetingTimeout: 30000, // 30秒握手超时
      socketTimeout: 60000, // 60秒数据传输超时
      pool: true, // 使用连接池
      maxConnections: 5, // 最大连接数
      maxMessages: 10, // 每个连接最多发送消息数
    });

    this.logger.log('SMTP 邮件服务初始化成功');
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
   * 发送邮箱变更通知邮件（发送到旧邮箱）
   */
  async sendEmailChangeNotification(
    oldEmail: string,
    newEmail: string,
    username: string,
    ipAddress?: string,
  ): Promise<void> {
    const changeTime = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });

    const subject = '【安全通知】您的账号邮箱已修改';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px 30px; }
    .alert-box { background-color: #fff3cd; border-left: 4px solid #ff6b6b; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
    .info-table td:first-child { font-weight: 600; color: #666; width: 100px; }
    .info-table td:last-child { color: #333; }
    .footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; }
    .security-tips { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px; }
    .security-tips h3 { margin-top: 0; color: #333; font-size: 16px; }
    .security-tips ul { margin: 10px 0; padding-left: 20px; color: #666; }
    .security-tips li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ 邮箱变更通知</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>安全提醒：</strong> 您的账号绑定邮箱已被修改。如果这不是您本人操作，请立即联系客服。
      </div>
      
      <p>尊敬的 <strong>${username}</strong>，</p>
      <p>您的账号绑定邮箱已成功修改。详细信息如下：</p>
      
      <table class="info-table">
        <tr>
          <td>原邮箱</td>
          <td>${oldEmail}</td>
        </tr>
        <tr>
          <td>新邮箱</td>
          <td>${newEmail}</td>
        </tr>
        <tr>
          <td>修改时间</td>
          <td>${changeTime}</td>
        </tr>
        ${ipAddress ? `<tr><td>操作IP</td><td>${ipAddress}</td></tr>` : ''}
      </table>

      <div class="security-tips">
        <h3>🔒 安全提示</h3>
        <ul>
          <li>如果这是您本人操作，请忽略此邮件</li>
          <li>如果您未进行此操作，说明您的账号可能已被他人控制</li>
          <li>请立即修改密码，并检查账号安全设置</li>
          <li>建议启用两步验证以提高账号安全性</li>
        </ul>
      </div>

      <p style="margin-top: 30px; color: #666;">
        <strong>注意：</strong>修改邮箱后，您将使用新邮箱进行登录和接收通知。
      </p>
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿直接回复</p>
      <p>© ${new Date().getFullYear()} 文档管理系统. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    const text = `
【安全通知】您的账号邮箱已修改

尊敬的 ${username}，

您的账号绑定邮箱已成功修改：

原邮箱：${oldEmail}
新邮箱：${newEmail}
修改时间：${changeTime}
${ipAddress ? `操作IP：${ipAddress}` : ''}

安全提示：
- 如果这是您本人操作，请忽略此邮件
- 如果您未进行此操作，说明您的账号可能已被他人控制
- 请立即修改密码，并检查账号安全设置

此邮件由系统自动发送，请勿直接回复。
© ${new Date().getFullYear()} 文档管理系统
`;

    await this.sendMail({
      to: oldEmail,
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
    // 如果使用 Resend
    if (this.mailProvider === 'resend') {
      return this.sendWithResend(options);
    }

    // SMTP 模式
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
   * 使用 Resend API 发送邮件
   */
  private async sendWithResend(options: SendMailOptions): Promise<void> {
    if (!this.resendClient) {
      throw new Error('Resend 客户端未初始化');
    }

    const from =
      this.configService.get<string>('RESEND_FROM') || 'onboarding@resend.dev';

    try {
      const { data, error } = await this.resendClient.emails.send({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        throw new Error(`Resend 发送失败: ${error.message}`);
      }

      this.logger.log(`Resend 邮件发送成功: ${data?.id} -> ${options.to}`);
    } catch (error) {
      this.logger.error(`Resend 发送邮件失败: ${options.to}`, error);
      throw new HttpException(
        '邮件发送失败,请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
