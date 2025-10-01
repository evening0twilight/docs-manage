import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileSystemItemEntity } from './document.entity';
// 文件上传模块
import { MulterModule } from '@nestjs/platform-express';
// 导入 PassportModule 以支持 JWT 认证
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileSystemItemEntity]),
    MulterModule.register({
      dest: './uploads', // 文件上传目录
    }),
    PassportModule, // 导入 PassportModule 以支持 JWT 认证
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
