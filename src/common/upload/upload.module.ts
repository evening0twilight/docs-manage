import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import cosConfig from './cos.config';

@Module({
  imports: [
    ConfigModule.forFeature(cosConfig),
    PassportModule,
    JwtModule.register({}), // 注册 JWT 模块以供 JwtAuthGuard 使用
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
