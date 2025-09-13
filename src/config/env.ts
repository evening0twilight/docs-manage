import { join } from 'path';

// 环境配置对象
export const envConfig = {
  path: join(process.cwd(), '.env'), // 直接使用项目根目录下的 .env 文件
};

// 数据库配置
export const databaseConfig = () => ({
  type: 'mysql' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'docs-manage',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production', // 生产环境不自动同步
  timezone: '+08:00',
  logging: process.env.NODE_ENV === 'development',
});

// JWT 配置
export const jwtConfig = () => ({
  secret: process.env.JWT_SECRET || 'default-jwt-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-jwt-refresh-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
});

// 应用配置
export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
});

// 文件上传配置
export const uploadConfig = () => ({
  dir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
});

// 导出所有配置
export default {
  database: databaseConfig,
  jwt: jwtConfig,
  app: appConfig,
  upload: uploadConfig,
  envPath: envConfig.path,
};
