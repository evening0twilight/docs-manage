-- 检查 document_permissions 表是否存在
SELECT 
    TABLE_NAME,
    TABLE_TYPE,
    ENGINE,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME
FROM 
    information_schema.TABLES 
WHERE 
    TABLE_SCHEMA = 'docs_manage' 
    AND TABLE_NAME = 'document_permissions';

-- 如果表不存在,运行以下创建语句
-- CREATE TABLE IF NOT EXISTS `document_permissions` (
--   `id` VARCHAR(36) PRIMARY KEY,
--   `document_id` INT NOT NULL,
--   `user_id` INT NOT NULL,
--   `role` ENUM('owner', 'editor', 'viewer') DEFAULT 'viewer',
--   `can_read` BOOLEAN DEFAULT TRUE,
--   `can_write` BOOLEAN DEFAULT FALSE,
--   `can_delete` BOOLEAN DEFAULT FALSE,
--   `can_share` BOOLEAN DEFAULT FALSE,
--   `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
--   `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
--   
--   FOREIGN KEY (`document_id`) REFERENCES `file_system_items`(`id`) ON DELETE CASCADE,
--   FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
--   
--   UNIQUE KEY `unique_document_user` (`document_id`, `user_id`),
--   INDEX `idx_document_id` (`document_id`),
--   INDEX `idx_user_id` (`user_id`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
