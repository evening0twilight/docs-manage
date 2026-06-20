import { join } from 'path';

// 环境配置对象
export const envConfig = {
  path: join(process.cwd(), '.env'), // 直接使用项目根目录下的 .env 文件
};

/**
 * 读取必填环境变量,缺失时直接抛错(fail-fast)。
 * 用于密钥等安全敏感配置——绝不允许回退到弱默认值。
 */
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`环境变量 ${key} 未配置,出于安全考虑拒绝启动`);
  }
  return value;
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

// JWT 配置(密钥为必填,缺失即抛错,杜绝弱默认值导致的令牌伪造风险)
export const jwtConfig = () => ({
  secret: requireEnv('JWT_SECRET'),
  refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
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

// AI 配置
export const aiConfig = () => ({
  useMock:
    process.env.AI_USE_MOCK === 'true' || process.env.AI_USE_MOCK === '1',
  provider: process.env.AI_PROVIDER || 'zhipu', // 'zhipu' 或 'openai'
  apiKey: process.env.AI_API_KEY || '',
  apiUrl: process.env.AI_API_URL || '',
  model: process.env.AI_MODEL || 'glm-4', // 智谱AI默认模型
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
});

// 导出所有配置
export default {
  database: databaseConfig,
  jwt: jwtConfig,
  app: appConfig,
  upload: uploadConfig,
  ai: aiConfig,
  envPath: envConfig.path,
};
