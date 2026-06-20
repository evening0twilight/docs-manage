import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentModule } from './document/document.module';
import { LogsModule } from './logs/logs.module';
import { MailModule } from './common/mail/mail.module';
import { UploadModule } from './common/upload/upload.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { YjsModule } from './yjs/yjs.module';
import { envConfig } from './config/env';
import { validate } from './config/validation';
import { APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, //设置为全局模块
      envFilePath: [envConfig.path],
      validate, // 启动时校验必填环境变量(含 JWT_SECRET / JWT_REFRESH_SECRET),缺失则 fail-fast
    }),
    ScheduleModule.forRoot(), // 启用定时任务模块
    // 全局限流:默认每 IP 60s 内最多 200 次请求(登录等敏感端点单独加严)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';
        const password = configService.get<string>('DB_PASSWORD', '');

        // 生产环境必须配置非空数据库密码,杜绝无密码访问
        if (isProduction && !password) {
          throw new Error('生产环境必须配置非空的 DB_PASSWORD');
        }

        return {
          type: 'mysql' as const, // 数据库类型
          entities: [__dirname + '/**/*.entity{.ts,.js}'], // 数据表实体
          host: configService.get<string>('DB_HOST', 'localhost'), // 主机，默认为localhost
          port: configService.get<number>('DB_PORT', 3306),
          username: configService.get<string>('DB_USERNAME', 'root'),
          password,
          database: configService.get<string>('DB_NAME', 'docs-manage'),
          timezone: '+08:00', // 服务器上配置的时区：东八时区
          autoLoadEntities: true, //自动加载实体
          // 生产环境禁用自动同步,避免自动改表导致数据丢失(改用迁移)
          synchronize: !isProduction,
          logging: !isProduction,
        };
      },
    }),
    MailModule,
    UploadModule,
    EventsModule,
    AiModule,
    UsersModule,
    DocumentModule,
    LogsModule,
    YjsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局限流守卫
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 这里加上了全局验证管道配置，用于全局验证数据
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true, // 自动移除非装饰器属性
          forbidNonWhitelisted: true, // 当有非白名单属性时抛出错误
          transform: true, // 自动转换数据类型
          transformOptions: {
            enableImplicitConversion: true, // 启用隐式类型转换
          },
          disableErrorMessages: false, // 在生产环境可以设为true
        }),
    },
  ],
})
export class AppModule {}
