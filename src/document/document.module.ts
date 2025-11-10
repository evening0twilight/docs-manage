import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentPermissionController } from './document-permission.controller';
import { DocumentCommentController } from './document-comment.controller';
import { DocumentService } from './document.service';
import { DocumentPermissionService } from './document-permission.service';
import { DocumentCommentService } from './document-comment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileSystemItemEntity } from './document.entity';
import { DocumentPermission } from './document-permission.entity';
import { DocumentComment } from './document-comment.entity';
import { UserEntity } from '../users/user.entity';
// 文件上传模块
import { MulterModule } from '@nestjs/platform-express';
// 导入 PassportModule 和 JwtModule 以支持 JWT 认证
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileSystemItemEntity,
      DocumentPermission,
      DocumentComment,
      UserEntity,
    ]),
    MulterModule.register({
      dest: './uploads', // 文件上传目录
    }),
    PassportModule, // 导入 PassportModule 以支持 JWT 认证
    JwtModule.register({}), // 导入 JwtModule 以支持 JWT 认证
  ],
  controllers: [
    DocumentController,
    DocumentPermissionController,
    DocumentCommentController,
  ],
  providers: [
    DocumentService,
    DocumentPermissionService,
    DocumentCommentService,
  ],
  exports: [DocumentService, DocumentPermissionService, DocumentCommentService],
})
export class DocumentModule {}
