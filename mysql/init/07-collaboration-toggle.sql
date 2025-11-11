-- 添加协同编辑开关字段
ALTER TABLE `file_system_items` 
ADD COLUMN `is_collaboration_enabled` TINYINT(1) NOT NULL DEFAULT 0 
COMMENT '协同编辑开关，0=关闭，1=开启' 
AFTER `isDeleted`;
