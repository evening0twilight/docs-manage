import { DataSource } from 'typeorm';

/**
 * 供 TypeORM CLI(migration:generate / migration:run)使用的独立数据源。
 *
 * 与 app.module 的运行时配置同源:同一套实体 glob、同一组 DB 环境变量。
 * 注意:CLI 不经过 @nestjs/config,数据库连接信息从 process.env 读取
 *       (生成基线迁移时可在命令行临时覆盖 DB_NAME 指向一个空库)。
 *
 * synchronize 固定为 false —— 迁移机制下表结构变更一律走 migration,
 * 不再依赖运行时自动同步。
 */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'docs-manage',
  charset: 'utf8mb4',
  timezone: '+08:00',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
