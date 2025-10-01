// 文件系统项目实体定义 - 统一支持文件夹和文档
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

// 项目类型枚举
export enum ItemType {
  FOLDER = 'folder',
  DOCUMENT = 'document',
}

// 文档类型枚举
export enum DocumentType {
  TEXT = 'text',
  IMAGE = 'image',
  WORD = 'word',
  EXCEL = 'excel',
  OTHER = 'other',
}

@Entity('file_system_items')
export class FileSystemItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string; // 文件夹名称或文档标题

  @Column({ length: 500, nullable: true })
  description: string; // 描述信息（文件夹和文档都可以有）

  @Column({
    type: 'enum',
    enum: ItemType,
  })
  itemType: ItemType; // 'folder' 或 'document'

  // === 文档相关字段 (仅当 itemType = 'document' 时使用) ===
  @Column({ length: 20, nullable: true })
  author: string;

  @Column('text', { nullable: true })
  content: string; // 文档内容

  @Column({ default: '', nullable: true })
  thumb_url: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
    nullable: true,
  })
  documentType: DocumentType; // 文档类型

  // === 层级关系字段 ===
  @Column({ nullable: true })
  parentId: number; // 父文件夹ID，null表示根级别

  @Column({ default: 0 })
  sortOrder: number; // 排序顺序

  // === 权限和状态字段 ===
  @Column({ name: 'creator_id' })
  creatorId: number;

  @Column({
    type: 'enum',
    enum: ['private', 'public', 'shared'],
    default: 'private',
  })
  visibility: 'private' | 'public' | 'shared';

  @Column({ default: false })
  isDeleted: boolean;

  // === 关联关系 ===
  // 创建者关联
  @ManyToOne(() => UserEntity, (user) => user.fileSystemItems, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: UserEntity;

  // 父文件夹关联
  @ManyToOne(() => FileSystemItemEntity, (item) => item.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: FileSystemItemEntity;

  // 子项关联
  @OneToMany(() => FileSystemItemEntity, (item) => item.parent)
  children: FileSystemItemEntity[];

  @CreateDateColumn({ name: 'created_time' })
  created_time: Date;

  @UpdateDateColumn({ name: 'updated_time' })
  updated_time: Date;
}

// 为了向后兼容，保留DocumentEntity别名
export { FileSystemItemEntity as DocumentEntity };
