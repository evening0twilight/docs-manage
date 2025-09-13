// 实体定义
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DocumentEntity } from '../document/document.entity';

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

  // 用户创建的文档 - 一对多关系
  @OneToMany(() => DocumentEntity, (document) => document.creator)
  documents: DocumentEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
