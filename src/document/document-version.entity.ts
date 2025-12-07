import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { FileSystemItemEntity } from './document.entity';
import { UserEntity } from '../users/user.entity';

/**
 * 文档版本实体
 * 用于存储文档的历史版本
 */
@Entity('document_versions')
@Index(['document', 'versionNumber'], { unique: false })
@Index(['contentHash'])
@Index(['createdAt'])
export class DocumentVersionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // 关联文档
  @ManyToOne(() => FileSystemItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: FileSystemItemEntity;

  @Column({ name: 'document_id' })
  documentId: number;

  // 版本号(递增)
  @Column({ name: 'version_number' })
  versionNumber: number;

  // 压缩后的内容(gzip)
  @Column({ type: 'longblob', name: 'compressed_content' })
  compressedContent: Buffer;

  // 内容大小(原始未压缩)
  @Column({ name: 'content_size' })
  contentSize: number;

  // 内容哈希(SHA256,用于去重)
  @Column({ length: 64, name: 'content_hash' })
  contentHash: string;

  // 创建者
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'author_id' })
  author: UserEntity;

  @Column({ name: 'author_id' })
  authorId: number;

  // 变更描述
  @Column({ length: 500, nullable: true, name: 'change_description' })
  changeDescription: string;

  // 是否自动保存
  @Column({ name: 'is_auto_save', default: true })
  isAutoSave: boolean;

  // 是否为恢复操作产生的版本
  @Column({ name: 'is_restore', default: false })
  isRestore: boolean;

  // 是否为差分版本
  @Column({ name: 'is_delta', default: false })
  isDelta: boolean;

  // 基础版本ID(差分存储时使用)
  @Column({ name: 'base_version_id', nullable: true })
  baseVersionId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
