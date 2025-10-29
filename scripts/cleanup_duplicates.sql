-- 清理邮件配额表中的重复记录
USE docs_manage;

-- 1. 查看当前是否有重复记录
SELECT provider, statDate, COUNT(*) as count
FROM mail_quota_stats
GROUP BY provider, statDate
HAVING count > 1;

-- 2. 删除今天的所有记录,让系统重新创建
DELETE FROM mail_quota_stats WHERE DATE(statDate) = CURDATE();

-- 3. 验证清理结果
SELECT * FROM mail_quota_stats WHERE DATE(statDate) = CURDATE();
-- 应该返回 0 条记录

-- 完成!现在可以重启应用了
