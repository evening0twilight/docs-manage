import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import 'reflect-metadata';

// 数据库迁移函数
async function runMigrations(app: NestExpressApplication) {
  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    console.log('[Migration] 开始检查数据库迁移...');

    // 检查 email_verification_codes 表是否存在
    const tableExists = await queryRunner.hasTable('email_verification_codes');
    if (!tableExists) {
      console.log('[Migration] email_verification_codes 表不存在,跳过迁移');
      return;
    }

    // 检查当前的 enum 值
    const result = await queryRunner.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'email_verification_codes' 
      AND COLUMN_NAME = 'type'
    `);

    const currentType = result[0]?.COLUMN_TYPE || '';
    console.log('[Migration] 当前 type 字段定义:', currentType);

    // 检查是否已经包含 change_email
    if (currentType.includes('change_email')) {
      console.log('[Migration] ✅ change_email 类型已存在,无需迁移');
      return;
    }

    // 执行迁移
    console.log('[Migration] 开始添加 change_email 类型...');
    await queryRunner.query(`
      ALTER TABLE email_verification_codes 
      MODIFY COLUMN type enum('register','reset_password','change_email') NOT NULL 
      COMMENT '验证码类型'
    `);

    console.log('[Migration] ✅ 成功添加 change_email 验证码类型');
  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error);
    // 不抛出错误，避免影响应用启动
  } finally {
    await queryRunner.release();
  }
}

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

  // 🚀 运行数据库迁移
  await runMigrations(app);

  // 配置CORS
  app.enableCors({
    origin: [
      'http://localhost:5173', // 本地开发
      'http://localhost:3000',
      'http://165.227.56.186', // 生产环境
      'http://165.227.56.186:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

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

  // 先配置 Swagger 文档（在全局前缀之前）
  setupSwagger(app);

  app.setGlobalPrefix('api', {
    exclude: ['api-docs', 'api-docs-json'], // 排除 Swagger 路由
  }); // 全局路由前缀

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
