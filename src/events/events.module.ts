import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsGateway } from './events.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { DocumentAccessService } from '../document/document-access.service';
import { FileSystemItemEntity } from '../document/document.entity';
import { DocumentPermission } from '../document/document-permission.entity';

@Module({
  imports: [
    // 供 DocumentAccessService 做 WebSocket 房间的文档级授权
    TypeOrmModule.forFeature([FileSystemItemEntity, DocumentPermission]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
    }),
  ],
  providers: [EventsGateway, WsJwtGuard, DocumentAccessService],
  exports: [EventsGateway],
})
export class EventsModule {}
