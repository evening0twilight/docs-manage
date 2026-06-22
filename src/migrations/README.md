# 数据库迁移(Migrations)

本目录是 TypeORM 迁移机制,用于让数据库表结构变更**版本化、可复现地落到生产**——
此前 `file_system_items`/`users` 等核心表没有版本化 DDL,生产是靠历史上某次
`synchronize` 建起来的(生产运行时 `synchronize:false`)。迁移机制补上了这一环。

数据源配置见 `../data-source.ts`(与 app.module 同源:同一套实体、同一组 DB 环境变量)。

## 常用命令

```bash
# 从实体变更生成新迁移(对比「当前连接的库」与实体的差异)
npm run migration:generate -- src/migrations/描述性名称

# 应用所有未执行的迁移(开发用 ts-node)
npm run migration:run

# 生产环境(用编译后的 dist):部署流程里执行
npm run build && npm run migration:run:prod

# 查看 / 回滚
npm run migration:show
npm run migration:revert
```

> 环境变量:`DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME`。生成基线时可临时指向空库。

## 基线迁移 `*-InitialSchema.ts`

是用 `migration:generate` 从**当前实体**对一个**空库**生成的全量建表 DDL(并非手写,
列类型/字符集/外键/索引与实体严格一致)。已验证:在空库执行后,生成的表与索引与开发库
`synchronize` 出来的 schema **完全一致**(表数、`file_system_items` 复合索引等逐一比对相同)。

## 在不同环境采用迁移

### A. 全新部署(空库)
1. 确保运行时 `synchronize:false`(生产默认已是)。
2. `npm run build && npm run migration:run:prod` → 基线迁移创建完整 schema。

### B. 已存在的生产库(表已由历史 synchronize 建好)
**不要直接 `migration:run`**——表已存在会报错。应把基线**标记为已应用**而不执行其 SQL:

```sql
-- 1) 确保有 migrations 记录表(没有则 TypeORM 首次会自动建)
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 2) 把基线标记为已执行(timestamp/name 取自基线文件名,如 1782159822766-InitialSchema)
INSERT INTO `migrations` (`timestamp`, `name`)
VALUES (1782159822766, 'InitialSchema1782159822766');
```

此后再 `migration:run` 只会执行**基线之后**新增的迁移。

> 注意:开发环境仍可保持 `synchronize:true`(快速迭代);一旦改用迁移管理,
> 应同步把开发库也按上面 B 步骤标记基线,避免两套机制冲突。
