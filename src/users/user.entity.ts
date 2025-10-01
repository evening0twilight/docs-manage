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

  @Column({ nullable: true, length: 500 })
  refreshToken?: string;

  @Column({ default: true })
  isActive: boolean;

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
