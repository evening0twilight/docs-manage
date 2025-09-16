import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { DocumentModule } from './document/document.module';
import { LogsModule } from './logs/logs.module';
import { envConfig } from './config/env';
// import { validate } from './config/validation';
import { APP_PIPE } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, //设置为全局模块
      envFilePath: [envConfig.path],
      // validate, // 暂时禁用验证
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const, // 数据库类型
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // 数据表实体
        host: configService.get<string>('DB_HOST', 'localhost'), // 主机，默认为localhost
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'docs-manage'),
        timezone: '+08:00', // 服务器上配置的时区：东八时区
        autoLoadEntities: true, //自动加载实体
        synchronize: configService.get<string>('NODE_ENV') !== 'production', //是否自动将实体同步到数据库
        logging: configService.get<string>('NODE_ENV') !== 'production', // 生产环境也开启日志用于调试
      }),
    }),
    UsersModule,
    DocumentModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
