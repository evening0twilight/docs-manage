-- 创建文档权限表
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
INSERT INTO `document_permissions` (`id`, `document_id`, `user_id`, `role`, `can_read`, `can_write`, `can_delete`, `can_share`)
SELECT 
  UUID() as id,
  `file_system_items`.`id` as document_id,
  `file_system_items`.`creator_id` as user_id,
  'owner' as role,
  TRUE as can_read,
  TRUE as can_write,
  TRUE as can_delete,
  TRUE as can_share
FROM `file_system_items`
WHERE `file_system_items`.`itemType` = 'document'
AND NOT EXISTS (
  SELECT 1 FROM `document_permissions` 
  WHERE `document_permissions`.`document_id` = `file_system_items`.`id` 
  AND `document_permissions`.`user_id` = `file_system_items`.`creator_id`
);
