import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { LogsController } from './logs.controller';
import { UserEntity } from '../users/user.entity';

@Module({
  // JwtAuthGuard 依赖 JwtService 与 UserEntity 仓库,需在此模块提供
  imports: [TypeOrmModule.forFeature([UserEntity]), JwtModule.register({})],
  controllers: [LogsController],
})
export class LogsModule {}
