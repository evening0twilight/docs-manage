import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { YjsService } from './yjs.service';
import { YjsDocumentEntity } from './yjs-document.entity';
import { DocumentAccessService } from '../document/document-access.service';
import { FileSystemItemEntity } from '../document/document.entity';
import { DocumentPermission } from '../document/document-permission.entity';

@Module({
  imports: [
    // YjsDocumentEntity 用于持久化;后两者供 DocumentAccessService 做文档级授权
    TypeOrmModule.forFeature([
      YjsDocumentEntity,
      FileSystemItemEntity,
      DocumentPermission,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  // 直接在本模块提供 DocumentAccessService(仅依赖上面两个仓库),
  // 避免 import 整个 DocumentModule 带来的循环依赖与额外控制器。
  providers: [YjsService, DocumentAccessService],
})
export class YjsModule {}
