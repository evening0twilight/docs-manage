import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentPermissionController } from './document-permission.controller';
import { DocumentService } from './document.service';
import { DocumentPermissionService } from './document-permission.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileSystemItemEntity } from './document.entity';
import { DocumentPermission } from './document-permission.entity';
import { UserEntity } from '../users/user.entity';
// 文件上传模块
import { MulterModule } from '@nestjs/platform-express';
// 导入 PassportModule 以支持 JWT 认证
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileSystemItemEntity,
      DocumentPermission,
      UserEntity,
    ]),
    MulterModule.register({
      dest: './uploads', // 文件上传目录
    }),
    PassportModule, // 导入 PassportModule 以支持 JWT 认证
  ],
  controllers: [DocumentController, DocumentPermissionController],
  providers: [DocumentService, DocumentPermissionService],
  exports: [DocumentService, DocumentPermissionService],
})
export class DocumentModule {}
