-- 邮箱验证功能相关表

-- 1. 邮箱验证码表
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL COMMENT '接收验证码的邮箱',
  code VARCHAR(10) NOT NULL COMMENT '验证码',
  type ENUM('register', 'reset_password', 'change_email') NOT NULL COMMENT '验证码类型',
  used BOOLEAN DEFAULT FALSE COMMENT '是否已使用',
  attempts INT DEFAULT 0 COMMENT '尝试次数',
  ip_address VARCHAR(45) COMMENT '请求IP地址',
  user_agent VARCHAR(500) COMMENT '用户代理',
  expires_at DATETIME NOT NULL COMMENT '过期时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_email_type (email, type),
  INDEX idx_expires_at (expires_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮箱验证码表';

-- 2. 邮件限流记录表
CREATE TABLE IF NOT EXISTS mail_rate_limits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  identifier VARCHAR(100) NOT NULL COMMENT '标识符（IP或邮箱）',
  limit_type ENUM('ip_daily', 'email_hourly', 'same_operation') NOT NULL COMMENT '限流类型',
  count INT DEFAULT 1 COMMENT '计数',
  operation_type VARCHAR(50) COMMENT '操作类型（用于same_operation）',
  window_start DATETIME NOT NULL COMMENT '时间窗口开始',
  expires_at DATETIME NOT NULL COMMENT '过期时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY unique_identifier_type (identifier, limit_type, window_start, operation_type),
  INDEX idx_expires_at (expires_at),
  INDEX idx_identifier (identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件限流记录表';

-- 3. 邮件发送日志表
CREATE TABLE IF NOT EXISTS mail_send_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider ENUM('qq', '163') NOT NULL COMMENT '邮件服务提供商',
  recipient_email VARCHAR(100) NOT NULL COMMENT '收件人邮箱',
  mail_type ENUM('verification', 'reset_password', 'notification') NOT NULL COMMENT '邮件类型',
  subject VARCHAR(200) COMMENT '邮件主题',
  status ENUM('success', 'failed', 'retry') NOT NULL COMMENT '发送状态',
  error_message TEXT COMMENT '错误信息',
  retry_count INT DEFAULT 0 COMMENT '重试次数',
  ip_address VARCHAR(45) COMMENT '请求IP地址',
  response_time INT COMMENT '响应时间（毫秒）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX idx_provider_date (provider, created_at),
  INDEX idx_recipient (recipient_email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件发送日志表';

-- 4. 邮件配额统计表（每日统计）
CREATE TABLE IF NOT EXISTS mail_quota_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider ENUM('qq', '163', 'total') NOT NULL COMMENT '邮件服务提供商',
  stat_date DATE NOT NULL COMMENT '统计日期',
  sent_count INT DEFAULT 0 COMMENT '已发送数量',
  failed_count INT DEFAULT 0 COMMENT '失败数量',
  quota_limit INT NOT NULL COMMENT '配额限制',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  
  UNIQUE KEY unique_provider_date (provider, stat_date),
  INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件配额统计表';

-- 5. 修改用户表，添加邮箱验证相关字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE COMMENT '邮箱是否已验证' AFTER email,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) NULL COMMENT '邮箱验证token' AFTER email_verified,
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255) NULL COMMENT '重置密码token' AFTER verification_token,
ADD COLUMN IF NOT EXISTS reset_password_expires DATETIME NULL COMMENT '重置密码token过期时间' AFTER reset_password_token;

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_reset_password_token ON users(reset_password_token);

-- 7. 插入初始配额统计数据（当天）
INSERT INTO mail_quota_stats (provider, stat_date, quota_limit)
VALUES 
  ('qq', CURDATE(), 500),
  ('163', CURDATE(), 200),
  ('total', CURDATE(), 700)
ON DUPLICATE KEY UPDATE quota_limit = VALUES(quota_limit);

-- 8. 创建定时清理过期数据的存储过程
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS clean_expired_email_data()
BEGIN
  -- 清理过期的验证码
  DELETE FROM email_verification_codes 
  WHERE expires_at < NOW() AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
  
  -- 清理过期的限流记录
  DELETE FROM mail_rate_limits 
  WHERE expires_at < NOW();
  
  -- 清理30天前的邮件发送日志
  DELETE FROM mail_send_logs 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
  
  -- 清理7天前的配额统计
  DELETE FROM mail_quota_stats 
  WHERE stat_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY);
END //

DELIMITER ;

-- 提示信息
SELECT '邮箱验证功能数据库初始化完成！' AS message;
SELECT CONCAT('- 邮箱验证码表: ', COUNT(*), ' 条记录') AS info FROM email_verification_codes
UNION ALL
SELECT CONCAT('- 限流记录表: ', COUNT(*), ' 条记录') FROM mail_rate_limits
UNION ALL
SELECT CONCAT('- 发送日志表: ', COUNT(*), ' 条记录') FROM mail_send_logs
UNION ALL
SELECT CONCAT('- 配额统计表: ', COUNT(*), ' 条记录') FROM mail_quota_stats;
