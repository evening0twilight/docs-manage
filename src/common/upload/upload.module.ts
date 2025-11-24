import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import cosConfig from './cos.config';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [
    ConfigModule.forFeature(cosConfig),
    PassportModule,
    JwtModule.register({}), // 注册 JWT 模块以供 JwtAuthGuard 使用
    forwardRef(() => UsersModule), // 使用 forwardRef 避免循环依赖
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
