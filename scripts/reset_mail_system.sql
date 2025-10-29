-- ============================================
-- 邮件系统数据库重置脚本
-- 用于清理所有邮件相关的测试数据
-- ============================================

USE docs_manage;

-- 1. 删除所有验证码记录
DELETE FROM email_verification_codes;
ALTER TABLE email_verification_codes AUTO_INCREMENT = 1;

-- 2. 删除所有配额统计记录
DELETE FROM mail_quota_stats;
ALTER TABLE mail_quota_stats AUTO_INCREMENT = 1;

-- 3. 删除所有频率限制记录
DELETE FROM mail_rate_limits;
ALTER TABLE mail_rate_limits AUTO_INCREMENT = 1;

-- 4. 删除所有发送日志记录  
DELETE FROM mail_send_logs;
ALTER TABLE mail_send_logs AUTO_INCREMENT = 1;

-- 5. 验证清理结果
SELECT '验证码记录数' as 表, COUNT(*) as 数量 FROM email_verification_codes
UNION ALL
SELECT '配额统计记录数', COUNT(*) FROM mail_quota_stats
UNION ALL
SELECT '频率限制记录数', COUNT(*) FROM mail_rate_limits
UNION ALL
SELECT '发送日志记录数', COUNT(*) FROM mail_send_logs;

SELECT '数据库清理完成!' as 状态;
