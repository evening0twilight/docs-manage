import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

// 配置 Swagger 文档
function setupSwagger(app: NestExpressApplication) {
  const config = new DocumentBuilder()
    .setTitle('文档管理系统 API')
    .setDescription('一个用于管理文档的 NestJS API 系统')
    .setVersion('1.0')
    .addTag('users', '用户管理相关接口')
    .addTag('documents', '文档管理相关接口')
    .addTag('logs', '系统日志相关接口')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '输入JWT token',
        in: 'header',
      },
      'JWT-auth', // 这里是标识符
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 保持授权状态
    },
    customSiteTitle: '文档管理系统 API 文档',
  });
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

  // 配置 Swagger 文档
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`应用已启动在端口 ${process.env.PORT ?? 3000}`);
  console.log(
    `日志查看器: http://localhost:${process.env.PORT ?? 3000}/logs.html`,
  );
  console.log(
    `API 文档: http://localhost:${process.env.PORT ?? 3000}/api-docs`,
  );
}

void bootstrap();
