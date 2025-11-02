#!/bin/bash

# 创建 document_permissions 表的脚本
# 这个脚本会保留所有现有数据,只添加新表

echo "开始创建 document_permissions 表..."

# 设置数据库连接信息(根据你的实际情况修改)
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="docs_manage"
DB_USER="root"
# 注意: 生产环境不要把密码写在脚本里,建议使用环境变量或交互式输入

# 执行 SQL
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME << 'EOF'

-- 检查表是否已存在
SELECT '检查 document_permissions 表是否存在...' as '';
SELECT COUNT(*) as 'table_exists' FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'docs_manage' AND TABLE_NAME = 'document_permissions';

-- 创建表(如果不存在)
SELECT '创建 document_permissions 表...' as '';
CREATE TABLE IF NOT EXISTS `document_permissions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `document_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `role` ENUM('owner', 'editor', 'viewer') DEFAULT 'viewer',
  `can_read` BOOLEAN DEFAULT TRUE,
  `can_write` BOOLEAN DEFAULT FALSE,
  `can_delete` BOOLEAN DEFAULT FALSE,
  `can_share` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  
  FOREIGN KEY (`document_id`) REFERENCES `file_system_items`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  
  UNIQUE KEY `unique_document_user` (`document_id`, `user_id`),
  INDEX `idx_document_id` (`document_id`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 为现有文档自动创建所有者权限
SELECT '为现有文档创建所有者权限...' as '';
INSERT INTO `document_permissions` (`id`, `document_id`, `user_id`, `role`, `can_read`, `can_write`, `can_delete`, `can_share`)
SELECT 
  UUID() as id,
  `id` as document_id,
  `creator_id` as user_id,
  'owner' as role,
  TRUE as can_read,
  TRUE as can_write,
  TRUE as can_delete,
  TRUE as can_share
FROM `file_system_items`
WHERE `itemType` = 'document'
AND NOT EXISTS (
  SELECT 1 FROM `document_permissions` 
  WHERE `document_id` = `file_system_items`.`id` 
  AND `user_id` = `file_system_items`.`creator_id`
);

-- 显示创建结果
SELECT '表创建完成,当前权限记录数:' as '';
SELECT COUNT(*) as 'total_permissions' FROM `document_permissions`;

SELECT '按角色统计:' as '';
SELECT role, COUNT(*) as count FROM `document_permissions` GROUP BY role;

EOF

echo "完成!"
