import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  MailQuotaStatsEntity,
  MailSendLogEntity,
  MailRateLimitEntity,
} from './entities/mail-stats.entity';
import { EmailVerificationCodeEntity } from './email-verification.entity';
import { MailConfig } from './mail.config';
import { MailService } from './mail.service';
import { MailQuotaService } from './mail-quota.service';
import { MailRateLimitService } from './mail-rate-limit.service';
import { EmailVerificationService } from './email-verification.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      MailQuotaStatsEntity,
      MailSendLogEntity,
      MailRateLimitEntity,
      EmailVerificationCodeEntity,
    ]),
  ],
  providers: [
    {
      provide: MailConfig,
      useFactory: (configService: ConfigService) =>
        new MailConfig(configService),
      inject: [ConfigService],
    },
    MailQuotaService,
    MailRateLimitService,
    MailService,
    EmailVerificationService,
  ],
  exports: [
    MailService,
    MailQuotaService,
    MailRateLimitService,
    EmailVerificationService,
  ],
})
export class MailModule {}
