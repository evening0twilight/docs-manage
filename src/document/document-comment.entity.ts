import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileSystemItemEntity } from './document.entity';
import { UserEntity } from '../users/user.entity';

@Entity('document_comments')
export class DocumentComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'document_id' })
  documentId: number;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'text', comment: '评论内容' })
  content: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'quoted_text',
    comment: '引用的原文',
  })
  quotedText: string;

  @Column({ type: 'int', name: 'start_pos', comment: '起始位置（字符偏移）' })
  startPos: number;

  @Column({ type: 'int', name: 'end_pos', comment: '结束位置' })
  endPos: number;

  @Column({ type: 'boolean', default: false, comment: '是否已解决' })
  resolved: boolean;

  @Column({
    type: 'int',
    nullable: true,
    name: 'resolved_by',
    comment: '解决者ID',
  })
  resolvedBy: number | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'resolved_at',
    comment: '解决时间',
  })
  resolvedAt: Date | null;

  @Column({
    type: 'int',
    nullable: true,
    name: 'parent_id',
    comment: '父评论ID(用于回复)',
  })
  parentId: number | null;

  @Column({ type: 'int', default: 0, name: 'reply_count', comment: '回复数量' })
  replyCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'deleted_at',
    comment: '软删除时间',
  })
  deletedAt: Date;

  // 关联关系
  @ManyToOne(() => FileSystemItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: FileSystemItemEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolver: UserEntity;

  @ManyToOne(() => DocumentComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parentComment: DocumentComment;
}
