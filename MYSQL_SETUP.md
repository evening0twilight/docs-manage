# MySQL 数据库设置指南

## 🔧 准备工作

### 1. 确保 MySQL 服务运行
```bash
# 检查 MySQL 服务状态 (Windows)
net start | findstr MySQL

# 如果没有运行，启动 MySQL 服务
net start MySQL80  # 或者 net start mysql
```

### 2. 创建数据库
使用 MySQL 命令行或图形工具（如 Navicat、phpMyAdmin）创建数据库：

```sql
-- 连接到 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE `docs-manage` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 验证数据库创建成功
SHOW DATABASES;

-- 退出
EXIT;
```

### 3. 验证连接配置
您的 `.env` 文件配置：
- 数据库主机: `localhost`
- 数据库端口: `3306`
- 用户名: `root`
- 密码: `Seem67wind`
- 数据库名: `docs-manage`

## 🚀 启动测试

### 步骤1: 创建数据库
```bash
# 登录 MySQL (使用您的密码)
mysql -u root -p

# 输入密码: Seem67wind
# 然后执行:
CREATE DATABASE `docs-manage` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
EXIT;
```

### 步骤2: 启动项目
```bash
cd e:\桌面\毕设\docs-manage
npm run start:dev
```

### 步骤3: 验证启动成功
看到类似以下日志表示成功：
```
[Nest] INFO [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] INFO [NestApplication] Nest application successfully started
```

## 🔍 常见问题解决

### 问题1: "Access denied for user 'root'@'localhost'"
**解决方案**: 
- 检查密码是否正确
- 确认用户 `root` 有权限访问数据库

### 问题2: "Can't connect to MySQL server"
**解决方案**:
- 确认 MySQL 服务正在运行
- 检查端口 3306 是否被占用
- 验证防火墙设置

### 问题3: "Unknown database 'docs-manage'"
**解决方案**:
- 创建数据库: `CREATE DATABASE \`docs-manage\`;`

## 📋 快速测试命令

测试 MySQL 连接：
```bash
mysql -h localhost -P 3306 -u root -p -e "SELECT 1;"
```

查看数据库：
```bash
mysql -u root -p -e "SHOW DATABASES;"
```