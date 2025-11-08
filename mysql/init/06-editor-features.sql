-- 编辑器功能模块数据库表
-- 创建时间: 2025-11-08
-- 说明: 支持协同编辑、评论、版本历史、AI助手功能

USE `docs-manage`;

-- ========================================
-- 1. 文档功能配置表
-- ========================================
CREATE TABLE IF NOT EXISTS `document_features` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NOT NULL COMMENT '文档ID',
  
  -- 功能开关
  `collaboration_enabled` BOOLEAN DEFAULT FALSE COMMENT '是否启用协同编辑',
  `ai_enabled` BOOLEAN DEFAULT FALSE COMMENT '是否启用AI助手',
  `comment_enabled` BOOLEAN DEFAULT TRUE COMMENT '是否启用评论',
  `history_enabled` BOOLEAN DEFAULT TRUE COMMENT '是否启用历史版本',
  
  -- 协同配置
  `collaboration_session_id` VARCHAR(64) NULL COMMENT '当前协同会话ID',
  `collaboration_started_at` TIMESTAMP NULL COMMENT '协同启动时间',
  `collaboration_started_by` BIGINT UNSIGNED NULL COMMENT '协同启动者ID',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 索引
  UNIQUE KEY `uk_document` (`document_id`),
  INDEX `idx_collaboration_enabled` (`collaboration_enabled`),
  
  -- 外键（根据你的实际表名调整）
  CONSTRAINT `fk_features_document` 
    FOREIGN KEY (`document_id`) 
    REFERENCES `documents`(`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档功能配置表';

-- ========================================
-- 2. 协同编辑会话表
-- ========================================
CREATE TABLE IF NOT EXISTS `collaboration_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `session_id` VARCHAR(64) NOT NULL UNIQUE COMMENT 'WebSocket会话ID',
  `document_id` BIGINT UNSIGNED NOT NULL COMMENT '文档ID',
  
  -- 会话状态
  `status` ENUM('active', 'ended') DEFAULT 'active' COMMENT '会话状态',
  
  -- 参与者信息
  `started_by` BIGINT UNSIGNED NOT NULL COMMENT '发起人ID',
  `participant_count` INT DEFAULT 0 COMMENT '当前参与人数',
  `max_concurrent_users` INT DEFAULT 0 COMMENT '最大并发用户数',
  
  -- 时间信息
  `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  `ended_at` TIMESTAMP NULL COMMENT '结束时间',
  `duration_seconds` INT NULL COMMENT '持续时间（秒）',
  
  -- 统计信息
  `total_edits` INT DEFAULT 0 COMMENT '总编辑次数',
  `total_words_added` INT DEFAULT 0 COMMENT '新增字数',
  `total_words_deleted` INT DEFAULT 0 COMMENT '删除字数',
  
  -- 索引
  INDEX `idx_document_status` (`document_id`, `status`),
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_started_at` (`started_at`),
  
  CONSTRAINT `fk_session_document` 
    FOREIGN KEY (`document_id`) 
    REFERENCES `documents`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_session_starter` 
    FOREIGN KEY (`started_by`) 
    REFERENCES `users`(`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='协同编辑会话表';

-- ========================================
-- 3. 协同会话参与者表
-- ========================================
CREATE TABLE IF NOT EXISTS `collaboration_participants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `session_id` BIGINT UNSIGNED NOT NULL COMMENT '会话ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `socket_id` VARCHAR(64) NULL COMMENT 'Socket连接ID',
  
  -- 参与信息
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `left_at` TIMESTAMP NULL COMMENT '离开时间',
  `duration_seconds` INT NULL COMMENT '参与时长（秒）',
  
  -- 活动统计
  `edit_count` INT DEFAULT 0 COMMENT '编辑次数',
  `cursor_moves` INT DEFAULT 0 COMMENT '光标移动次数',
  
  -- 索引
  INDEX `idx_session_user` (`session_id`, `user_id`),
  INDEX `idx_socket_id` (`socket_id`),
  
  CONSTRAINT `fk_participant_session` 
    FOREIGN KEY (`session_id`) 
    REFERENCES `collaboration_sessions`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_participant_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users`(`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='协同会话参与者表';

-- ========================================
-- 4. 文档评论表
-- ========================================
CREATE TABLE IF NOT EXISTS `document_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NOT NULL COMMENT '文档ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '评论者ID',
  
  -- 评论内容
  `content` TEXT NOT NULL COMMENT '评论内容',
  `quoted_text` TEXT NULL COMMENT '引用的原文',
  
  -- 位置信息（字符偏移量）
  `start_pos` INT NOT NULL COMMENT '起始位置',
  `end_pos` INT NOT NULL COMMENT '结束位置',
  
  -- 状态
  `resolved` BOOLEAN DEFAULT FALSE COMMENT '是否已解决',
  `resolved_by` BIGINT UNSIGNED NULL COMMENT '解决者ID',
  `resolved_at` TIMESTAMP NULL COMMENT '解决时间',
  
  -- 回复关系
  `parent_id` BIGINT UNSIGNED NULL COMMENT '父评论ID（用于回复）',
  `reply_count` INT DEFAULT 0 COMMENT '回复数量',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL COMMENT '软删除时间',
  
  -- 索引
  INDEX `idx_document_unresolved` (`document_id`, `resolved`, `deleted_at`),
  INDEX `idx_user_comments` (`user_id`, `created_at`),
  INDEX `idx_parent_id` (`parent_id`),
  
  CONSTRAINT `fk_comment_document` 
    FOREIGN KEY (`document_id`) 
    REFERENCES `documents`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_comment_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_comment_parent` 
    FOREIGN KEY (`parent_id`) 
    REFERENCES `document_comments`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_comment_resolver` 
    FOREIGN KEY (`resolved_by`) 
    REFERENCES `users`(`id`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档评论表';

-- ========================================
-- 5. 文档版本历史表
-- ========================================
CREATE TABLE IF NOT EXISTS `document_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NOT NULL COMMENT '文档ID',
  `version_number` INT NOT NULL COMMENT '版本号',
  
  -- 内容快照
  `content` LONGTEXT NOT NULL COMMENT 'TipTap JSON格式内容',
  `html` LONGTEXT NULL COMMENT 'HTML格式（用于预览）',
  `plain_text` LONGTEXT NULL COMMENT '纯文本（用于对比和搜索）',
  
  -- 变更信息
  `change_summary` VARCHAR(500) NULL COMMENT '修改说明',
  `change_type` ENUM('auto', 'manual', 'collab', 'restore') DEFAULT 'auto' COMMENT '变更类型',
  
  -- 创建者
  `created_by` BIGINT UNSIGNED NOT NULL COMMENT '创建者ID',
  
  -- 统计信息
  `word_count` INT DEFAULT 0 COMMENT '字数',
  `character_count` INT DEFAULT 0 COMMENT '字符数',
  `size_bytes` INT DEFAULT 0 COMMENT '内容大小（字节）',
  
  -- 协同信息
  `collaboration_session_id` BIGINT UNSIGNED NULL COMMENT '关联的协同会话ID',
  `collaborators` JSON NULL COMMENT '参与编辑的用户列表 [{userId, username, editCount}]',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 索引
  UNIQUE KEY `uk_document_version` (`document_id`, `version_number`),
  INDEX `idx_document_created` (`document_id`, `created_at` DESC),
  INDEX `idx_created_by` (`created_by`, `created_at`),
  
  CONSTRAINT `fk_version_document` 
    FOREIGN KEY (`document_id`) 
    REFERENCES `documents`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_version_creator` 
    FOREIGN KEY (`created_by`) 
    REFERENCES `users`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_version_session` 
    FOREIGN KEY (`collaboration_session_id`) 
    REFERENCES `collaboration_sessions`(`id`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本历史表';

-- ========================================
-- 6. AI 对话历史表
-- ========================================
CREATE TABLE IF NOT EXISTS `ai_chat_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NOT NULL COMMENT '文档ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  
  -- 对话内容
  `role` ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
  `content` TEXT NOT NULL COMMENT '消息内容',
  
  -- 上下文
  `selected_text` TEXT NULL COMMENT '用户选中的文本',
  `prompt_type` VARCHAR(50) NULL COMMENT '提示类型: improve/summarize/translate/custom',
  
  -- 会话分组
  `session_id` VARCHAR(64) NULL COMMENT '会话ID（同一次对话）',
  `sequence_number` INT DEFAULT 0 COMMENT '会话内的消息序号',
  
  -- AI 元数据
  `model` VARCHAR(50) NULL COMMENT '使用的AI模型',
  `tokens_used` INT NULL COMMENT '消耗的token数量',
  `response_time_ms` INT NULL COMMENT '响应时间（毫秒）',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX `idx_document_session` (`document_id`, `session_id`, `sequence_number`),
  INDEX `idx_user_history` (`user_id`, `created_at` DESC),
  INDEX `idx_session_id` (`session_id`),
  
  CONSTRAINT `fk_ai_chat_document` 
    FOREIGN KEY (`document_id`) 
    REFERENCES `documents`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_ai_chat_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users`(`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话历史表';

-- ========================================
-- 7. 文档编辑日志表（用于审计和统计）
-- ========================================
CREATE TABLE IF NOT EXISTS `document_edit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NOT NULL COMMENT '文档ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '编辑者ID',
  
  -- 编辑操作
  `operation_type` ENUM('insert', 'delete', 'replace', 'format') NOT NULL COMMENT '操作类型',
  `position` INT NOT NULL COMMENT '操作位置',
  `content_length` INT DEFAULT 0 COMMENT '内容长度',
  
  -- 会话信息
  `session_id` BIGINT UNSIGNED NULL COMMENT '协同会话ID',
  `socket_id` VARCHAR(64) NULL COMMENT 'Socket连接ID',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX `idx_document_time` (`document_id`, `created_at`),
  INDEX `idx_user_activity` (`user_id`, `created_at`),
  INDEX `idx_session` (`session_id`),
  
  -- 分区（按月分区，提高查询性能）
  PARTITION BY RANGE (TO_DAYS(`created_at`)) (
    PARTITION p202501 VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p202502 VALUES LESS THAN (TO_DAYS('2025-03-01')),
    PARTITION p202503 VALUES LESS THAN (TO_DAYS('2025-04-01')),
    PARTITION p202504 VALUES LESS THAN (TO_DAYS('2025-05-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档编辑日志表';

-- ========================================
-- 初始化数据
-- ========================================

-- 为现有文档创建默认功能配置
INSERT INTO `document_features` (`document_id`, `collaboration_enabled`, `ai_enabled`, `comment_enabled`, `history_enabled`)
SELECT `id`, FALSE, FALSE, TRUE, TRUE
FROM `documents`
WHERE NOT EXISTS (
  SELECT 1 FROM `document_features` WHERE `document_features`.`document_id` = `documents`.`id`
);

-- 输出确认信息
SELECT 'Editor features tables created successfully!' AS status;
SELECT '✅ document_features' AS created_tables
UNION ALL SELECT '✅ collaboration_sessions'
UNION ALL SELECT '✅ collaboration_participants'
UNION ALL SELECT '✅ document_comments'
UNION ALL SELECT '✅ document_versions'
UNION ALL SELECT '✅ ai_chat_history'
UNION ALL SELECT '✅ document_edit_logs';
