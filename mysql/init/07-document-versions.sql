-- 创建文档版本表
CREATE TABLE IF NOT EXISTS `document_versions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '版本ID',
  `document_id` INT NOT NULL COMMENT '文档ID',
  `version_number` INT NOT NULL COMMENT '版本号',
  `compressed_content` LONGBLOB NOT NULL COMMENT '压缩后的内容(gzip)',
  `content_size` INT NOT NULL COMMENT '原始内容大小(字节)',
  `content_hash` VARCHAR(64) NOT NULL COMMENT '内容SHA256哈希(用于去重)',
  `author_id` INT NOT NULL COMMENT '创建者ID',
  `change_description` VARCHAR(500) NULL COMMENT '变更描述',
  `is_auto_save` BOOLEAN DEFAULT TRUE COMMENT '是否自动保存',
  `is_restore` BOOLEAN DEFAULT FALSE COMMENT '是否为恢复操作',
  `is_delta` BOOLEAN DEFAULT FALSE COMMENT '是否为差分版本',
  `base_version_id` INT NULL COMMENT '基础版本ID(差分存储)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX `idx_document_id` (`document_id`),
  INDEX `idx_document_version` (`document_id`, `version_number` DESC),
  INDEX `idx_content_hash` (`content_hash`),
  INDEX `idx_created_at` (`created_at` DESC),
  INDEX `idx_author` (`author_id`),
  INDEX `idx_cleanup` (`document_id`, `is_auto_save`, `created_at` DESC),
  
  -- 外键约束
  CONSTRAINT `fk_version_document` FOREIGN KEY (`document_id`) 
    REFERENCES `file_system_items`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_version_author` FOREIGN KEY (`author_id`) 
    REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本表';

-- 添加文档版本数统计触发器(可选)
DELIMITER //

CREATE TRIGGER after_version_insert
AFTER INSERT ON document_versions
FOR EACH ROW
BEGIN
  -- 这里可以添加版本创建后的逻辑
  -- 例如:更新文档的最后修改时间
  UPDATE file_system_items 
  SET updated_at = NOW() 
  WHERE id = NEW.document_id;
END//

DELIMITER ;
