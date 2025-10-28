-- 添加 change_email 验证码类型
-- 修改 email_verification_codes 表的 type 字段枚举值

ALTER TABLE `email_verification_codes` 
MODIFY COLUMN `type` enum('register','reset_password','change_email') NOT NULL 
COMMENT '验证码类型';
