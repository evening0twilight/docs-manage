import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentPermissionController } from './document-permission.controller';
import { DocumentCommentController } from './document-comment.controller';
import { DocumentVersionController } from './document-version.controller';
import { DocumentService } from './document.service';
import { DocumentPermissionService } from './document-permission.service';
import { DocumentCommentService } from './document-comment.service';
import { DocumentVersionService } from './document-version.service';
import { DocumentVersionCompareService } from './document-version-compare.service';
import { DocumentVersionDeltaService } from './document-version-delta.service';
import { DocumentVersionCleanupService } from './document-version-cleanup.service';
import { DocumentVersionConflictService } from './document-version-conflict.service';
import { DocumentDailyVersionService } from './document-daily-version.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileSystemItemEntity } from './document.entity';
import { DocumentPermission } from './document-permission.entity';
import { DocumentComment } from './document-comment.entity';
import { DocumentVersionEntity } from './document-version.entity';
import { UserEntity } from '../users/user.entity';
// 文件上传模块
import { MulterModule } from '@nestjs/platform-express';
// 导入 PassportModule 和 JwtModule 以支持 JWT 认证
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileSystemItemEntity,
      DocumentPermission,
      DocumentComment,
      DocumentVersionEntity,
      UserEntity,
    ]),
    MulterModule.register({
      dest: './uploads', // 文件上传目录
    }),
    PassportModule, // 导入 PassportModule 以支持 JWT 认证
    JwtModule.register({}), // 导入 JwtModule 以支持 JWT 认证
    EventsModule, // 导入 EventsModule 以支持 WebSocket 通知
  ],
  controllers: [
    DocumentController,
    DocumentPermissionController,
    DocumentCommentController,
    DocumentVersionController,
  ],
  providers: [
    DocumentService,
    DocumentPermissionService,
    DocumentCommentService,
    DocumentVersionService,
    DocumentVersionCompareService,
    DocumentVersionDeltaService,
    DocumentVersionCleanupService,
    DocumentVersionConflictService,
    DocumentDailyVersionService,
  ],
  exports: [
    DocumentService,
    DocumentPermissionService,
    DocumentCommentService,
    DocumentVersionService,
    DocumentVersionCompareService,
    DocumentVersionDeltaService,
    DocumentVersionConflictService,
  ],
})
export class DocumentModule {}
