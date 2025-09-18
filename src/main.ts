import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
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
  const publicPath = join(__dirname, '..', 'public');
  const altPublicPath = join(process.cwd(), 'public');
  
  console.log('Static files path:', publicPath);
  console.log('Alt static files path:', altPublicPath);
  console.log('Current __dirname:', __dirname);
  console.log('Current cwd:', process.cwd());

  // 检查目录是否存在，优先使用工作目录下的public
  let finalPublicPath = publicPath;
  if (existsSync(altPublicPath)) {
    console.log('Using alt public directory');
    const files = readdirSync(altPublicPath);
    console.log('Files in alt public directory:', files);
    finalPublicPath = altPublicPath;
  } else if (existsSync(publicPath)) {
    console.log('Using default public directory');
    const files = readdirSync(publicPath);
    console.log('Files in public directory:', files);
  } else {
    console.log('No public directory found');
  }

  app.useStaticAssets(finalPublicPath);

  // 启用全局异常过滤器以便捕获详细错误信息
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api'); // 全局路由前缀
  await app.listen(process.env.PORT ?? 3000);
  console.log(`应用已启动在端口 ${process.env.PORT ?? 3000}`);
  console.log(
    `日志查看器: http://localhost:${process.env.PORT ?? 3000}/logs.html`,
  );
}

void bootstrap();
