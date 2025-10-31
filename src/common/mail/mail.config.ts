import { ConfigService } from '@nestjs/config';

export interface MailProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  dailyLimit: number;
}

export class MailConfig {
  qq: MailProviderConfig;
  _163: MailProviderConfig;
  strategy: 'smart' | 'qq' | '163';
  totalDailyLimit: number;
  quotaWarningPercent: number;
  quotaStrictPercent: number;
  rateLimitIpDaily: number;
  rateLimitEmailHourly: number;
  rateLimitSameOperation: number;
  retryTimes: number;
  retryInterval: number;
  frontendUrl: string;

  constructor(configService: ConfigService) {
    // QQ邮箱配置
    this.qq = {
      host: configService.get<string>('MAIL_QQ_HOST', 'smtp.qq.com'),
      port: configService.get<number>('MAIL_QQ_PORT', 465),
      secure: configService.get<boolean>('MAIL_QQ_SECURE', true),
      user: configService.get<string>('MAIL_QQ_USER', ''),
      password: configService.get<string>('MAIL_QQ_PASSWORD', ''),
      from: configService.get<string>('MAIL_QQ_FROM', ''),
      dailyLimit: configService.get<number>('MAIL_QQ_DAILY_LIMIT', 500),
    };

    // 163邮箱配置
    this._163 = {
      host: configService.get<string>('MAIL_163_HOST', 'smtp.163.com'),
      port: configService.get<number>('MAIL_163_PORT', 465),
      secure: configService.get<boolean>('MAIL_163_SECURE', true),
      user: configService.get<string>('MAIL_163_USER', ''),
      password: configService.get<string>('MAIL_163_PASSWORD', ''),
      from: configService.get<string>('MAIL_163_FROM', ''),
      dailyLimit: configService.get<number>('MAIL_163_DAILY_LIMIT', 200),
    };

    // 策略配置
    this.strategy = configService.get<'smart' | 'qq' | '163'>(
      'MAIL_STRATEGY',
      'smart',
    );
    this.totalDailyLimit = configService.get<number>(
      'MAIL_TOTAL_DAILY_LIMIT',
      700,
    );
    this.quotaWarningPercent = configService.get<number>(
      'MAIL_QUOTA_WARNING_PERCENT',
      80,
    );
    this.quotaStrictPercent = configService.get<number>(
      'MAIL_QUOTA_STRICT_PERCENT',
      90,
    );

    // 限流配置
    this.rateLimitIpDaily = configService.get<number>(
      'MAIL_RATE_LIMIT_IP_DAILY',
      100,
    );
    this.rateLimitEmailHourly = configService.get<number>(
      'MAIL_RATE_LIMIT_EMAIL_HOURLY',
      5,
    );
    this.rateLimitSameOperation = configService.get<number>(
      'MAIL_RATE_LIMIT_SAME_OPERATION',
      60,
    );

    // 重试配置
    this.retryTimes = configService.get<number>('MAIL_RETRY_TIMES', 3);
    this.retryInterval = configService.get<number>('MAIL_RETRY_INTERVAL', 5000);

    // 前端地址
    this.frontendUrl = configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
  }

  // 验证配置是否完整
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.qq.user || !this.qq.password) {
      errors.push('QQ邮箱配置不完整');
    }
    if (!this._163.user || !this._163.password) {
      errors.push('163邮箱配置不完整');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
