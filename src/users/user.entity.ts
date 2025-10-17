// 实体定义
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FileSystemItemEntity } from '../document/document.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  password: string;

  // ========== 个人资料 ==========
  @Column({ nullable: true, length: 500, comment: '用户头像URL' })
  avatar?: string;

  @Column({ nullable: true, length: 100, comment: '昵称/显示名称' })
  displayName?: string;

  @Column({ nullable: true, length: 20, comment: '手机号' })
  phone?: string;

  @Column({ nullable: true, type: 'text', comment: '个人简介' })
  bio?: string;

  @Column({ nullable: true, length: 100, comment: '所在地' })
  location?: string;

  @Column({ nullable: true, length: 200, comment: '个人网站' })
  website?: string;

  @Column({ nullable: true, length: 100, comment: '公司/组织' })
  organization?: string;

  @Column({ nullable: true, length: 100, comment: '职位' })
  position?: string;

  // ========== 协作相关字段 ==========
  @Column({ nullable: true, length: 10, comment: '用户状态颜色(协作时显示)' })
  statusColor?: string;

  @Column({
    type: 'enum',
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline',
    comment: '在线状态',
  })
  onlineStatus: string;

  @Column({ nullable: true, type: 'timestamp', comment: '最后活跃时间' })
  lastActiveAt?: Date;

  @Column({ default: true, comment: '是否接受协作邀请' })
  allowCollaboration: boolean;

  @Column({ default: true, comment: '是否显示在线状态' })
  showOnlineStatus: boolean;

  // ========== 系统字段 ==========
  @Column({ nullable: true, length: 500 })
  refreshToken?: string;

  @Column({ default: true, comment: '账号是否激活' })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamp', comment: '最后登录时间' })
  lastLoginAt?: Date;

  // 用户创建的文件系统项目（文档和文件夹） - 一对多关系
  @OneToMany(() => FileSystemItemEntity, (item) => item.creator)
  fileSystemItems: FileSystemItemEntity[];

  // 兼容性别名
  get documents() {
    return this.fileSystemItems;
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
