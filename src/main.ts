import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import 'reflect-metadata';

// 修复 crypto 未定义问题 - 更强的 polyfill
async function setupCrypto() {
  // 尝试多种方式设置 crypto
  if (typeof global.crypto === 'undefined') {
    try {
      const { webcrypto } = await import('node:crypto');
      (global as any).crypto = webcrypto;
    } catch (error) {
      console.log('Failed to setup crypto polyfill:', error);
    }
  }

  // 如果还是没有，使用另一种方式
  if (typeof global.crypto === 'undefined') {
    try {
      const crypto = await import('crypto');
      (global as any).crypto = {
        randomUUID: () => crypto.randomUUID(),
        subtle: crypto.webcrypto?.subtle,
        getRandomValues: (arr: any): any => {
          if (crypto.webcrypto?.getRandomValues) {
            return crypto.webcrypto.getRandomValues(arr);
          }
          return arr;
        },
      };
    } catch (error) {
      console.log('Failed to setup fallback crypto:', error);
    }
  }
}

async function bootstrap() {
  await setupCrypto(); // 确保 crypto 在应用启动前设置好
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 配置静态文件服务
  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.setGlobalPrefix('api'); // 全局路由前缀
  await app.listen(process.env.PORT ?? 3000);
  console.log(`应用已启动在端口 ${process.env.PORT ?? 3000}`);
  console.log(
    `日志查看器: http://localhost:${process.env.PORT ?? 3000}/logs.html`,
  );
}

void bootstrap();
