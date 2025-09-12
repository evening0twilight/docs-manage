import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './document.entity';
// 文件上传模块
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    MulterModule.register({
      dest: './uploads', // 文件上传目录
    }),
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
