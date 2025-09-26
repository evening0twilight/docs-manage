// 实体定义
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  id: number; // 标记为主列，值自动生成

  @Column({ length: 50 })
  title: string;

  @Column({ length: 20 })
  author: string;

  @Column('text')
  content: string;

  @Column({ default: '' })
  thumb_url: string;

  @Column('tinyint')
  type: number;

  // 创建者ID - 普通字段
  @Column({ name: 'creator_id' })
  creatorId: number;

  // 创建者关联 - 多对一关系（不使用eager加载来避免冲突）
  @ManyToOne(() => UserEntity, (user) => user.documents, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: UserEntity;

  // 文档权限级别
  @Column({
    type: 'enum',
    enum: ['private', 'public', 'shared'],
    default: 'private',
  })
  visibility: 'private' | 'public' | 'shared';

  // 是否已删除（软删除）
  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_time' })
  created_time: Date;

  @UpdateDateColumn({ name: 'updated_time' })
  updated_time: Date;
}
