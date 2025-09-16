-- 数据库初始化脚本
-- 这个脚本会在 MySQL 容器首次启动时自动执行

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `docs_manage` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（如果不存在）
CREATE USER IF NOT EXISTS 'docs_user'@'%' IDENTIFIED BY 'Seem67wind123!';

-- 授予用户对数据库的所有权限
GRANT ALL PRIVILEGES ON `docs_manage`.* TO 'docs_user'@'%';

-- 刷新权限表
FLUSH PRIVILEGES;

-- 切换到目标数据库
USE `docs_manage`;

-- 输出确认信息
SELECT 'Database and user setup completed successfully!' AS status;