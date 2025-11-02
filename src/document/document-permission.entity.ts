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

export enum PermissionRole {
  OWNER = 'owner', // 所有者（创建者）
  EDITOR = 'editor', // 编辑者（可编辑）
  VIEWER = 'viewer', // 查看者（只读）
}

@Entity('document_permissions')
export class DocumentPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'int' })
  documentId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({
    type: 'enum',
    enum: PermissionRole,
    default: PermissionRole.VIEWER,
  })
  role: PermissionRole;

  @Column({ name: 'can_read', default: true })
  canRead: boolean;

  @Column({ name: 'can_write', default: false })
  canWrite: boolean;

  @Column({ name: 'can_delete', default: false })
  canDelete: boolean;

  @Column({ name: 'can_share', default: false })
  canShare: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => FileSystemItemEntity, (document) => document.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: FileSystemItemEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
