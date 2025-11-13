-- 添加单点登录支持: tokenVersion字段
-- 当用户在新地方登录时,tokenVersion会递增,使旧token失效

ALTER TABLE `users` 
ADD COLUMN `tokenVersion` INT NOT NULL DEFAULT 0 COMMENT 'Token版本号,用于单点登录强制失效旧token' 
AFTER `refreshToken`;

-- 为现有用户初始化tokenVersion为0
UPDATE `users` SET `tokenVersion` = 0 WHERE `tokenVersion` IS NULL;
