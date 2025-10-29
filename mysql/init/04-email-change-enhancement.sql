-- 邮箱修改增强功能：添加冷却期和尝试次数字段

-- 1. 为 users 表添加邮箱修改时间字段
ALTER TABLE `users`
ADD COLUMN `last_email_changed_at` TIMESTAMP NULL COMMENT '上次邮箱修改时间（用于冷却期检查）'
AFTER `last_login_at`;

-- 2. 为 email_verification_codes 表添加验证尝试次数字段
ALTER TABLE `email_verification_codes`
ADD COLUMN `verify_attempts` INT NOT NULL DEFAULT 0 COMMENT '验证尝试次数'
AFTER `used_at`;

-- 3. 为现有的验证码记录设置默认值
UPDATE `email_verification_codes` SET `verify_attempts` = 0 WHERE `verify_attempts` IS NULL;

-- 4. 添加索引以提升查询性能
CREATE INDEX `idx_last_email_changed` ON `users`(`last_email_changed_at`);
CREATE INDEX `idx_verify_attempts` ON `email_verification_codes`(`verify_attempts`);

-- 5. 显示修改结果
SELECT 'Email change enhancement migration completed successfully!' AS status;
