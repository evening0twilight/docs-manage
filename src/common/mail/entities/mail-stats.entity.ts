import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('mail_quota_stats')
@Index(['provider', 'statDate'], { unique: true })
export class MailQuotaStatsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['qq', '163', 'total'],
    comment: '邮件服务提供商',
  })
  provider: 'qq' | '163' | 'total';

  @Column({ type: 'date', name: 'stat_date', comment: '统计日期' })
  statDate: Date;

  @Column({ name: 'sent_count', default: 0, comment: '已发送数量' })
  sentCount: number;

  @Column({ name: 'failed_count', default: 0, comment: '失败数量' })
  failedCount: number;

  @Column({ name: 'quota_limit', comment: '配额限制' })
  quotaLimit: number;

  @UpdateDateColumn({ name: 'last_updated', comment: '最后更新时间' })
  lastUpdated: Date;
}

@Entity('mail_send_logs')
@Index(['provider', 'createdAt'])
@Index(['recipientEmail'])
export class MailSendLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['qq', '163'],
    comment: '邮件服务提供商',
  })
  provider: 'qq' | '163';

  @Column({ name: 'recipient_email', length: 100, comment: '收件人邮箱' })
  recipientEmail: string;

  @Column({
    name: 'mail_type',
    type: 'enum',
    enum: ['verification', 'reset_password', 'notification'],
    comment: '邮件类型',
  })
  mailType: 'verification' | 'reset_password' | 'notification';

  @Column({ length: 200, nullable: true, comment: '邮件主题' })
  subject: string;

  @Column({
    type: 'enum',
    enum: ['success', 'failed', 'retry'],
    comment: '发送状态',
  })
  status: 'success' | 'failed' | 'retry';

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
    comment: '错误信息',
  })
  errorMessage: string;

  @Column({ name: 'retry_count', default: 0, comment: '重试次数' })
  retryCount: number;

  @Column({
    name: 'ip_address',
    length: 45,
    nullable: true,
    comment: '请求IP地址',
  })
  ipAddress: string;

  @Column({
    name: 'response_time',
    nullable: true,
    comment: '响应时间（毫秒）',
  })
  responseTime: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;
}

@Entity('mail_rate_limits')
@Index(['identifier', 'limitType', 'windowStart', 'operationType'], {
  unique: true,
})
@Index(['expiresAt'])
export class MailRateLimitEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, comment: '标识符（IP或邮箱）' })
  identifier: string;

  @Column({
    name: 'limit_type',
    type: 'enum',
    enum: ['ip_daily', 'email_hourly', 'same_operation'],
    comment: '限流类型',
  })
  limitType: 'ip_daily' | 'email_hourly' | 'same_operation';

  @Column({ default: 1, comment: '计数' })
  count: number;

  @Column({
    name: 'operation_type',
    length: 50,
    nullable: true,
    comment: '操作类型',
  })
  operationType: string;

  @Column({ name: 'window_start', type: 'datetime', comment: '时间窗口开始' })
  windowStart: Date;

  @Column({ name: 'expires_at', type: 'datetime', comment: '过期时间' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
