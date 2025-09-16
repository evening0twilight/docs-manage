import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';

// 修复 crypto 未定义问题 - 在应用启动前等待设置完成
async function setupCrypto() {
  if (!global.crypto) {
    const { webcrypto } = await import('node:crypto');
    Object.defineProperty(global, 'crypto', {
      value: webcrypto,
      writable: false,
      configurable: true,
    });
  }
}

async function bootstrap() {
  await setupCrypto(); // 确保 crypto 在应用启动前设置好
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // 全局路由前缀
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
