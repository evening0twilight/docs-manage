import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { YjsService } from './yjs.service';
import { YjsDocumentEntity } from './yjs-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([YjsDocumentEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [YjsService],
})
export class YjsModule {}
