import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('email_verification_codes')
@Index(['email', 'code'])
@Index(['expiresAt'])
export class EmailVerificationCodeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 6 })
  code: string;

  @Column({
    type: 'enum',
    enum: ['register', 'reset_password', 'change_email'],
  })
  type: 'register' | 'reset_password' | 'change_email';

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false, name: 'is_used' })
  isUsed: boolean;

  @Column({
    type: 'timestamp',
    name: 'used_at',
    nullable: true,
    default: null,
  })
  usedAt: Date | null;
}
