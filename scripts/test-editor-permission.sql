-- 测试编辑者权限查询
-- 用于验证被分享者是否有编辑权限

-- 1. 查看文档权限表中的所有记录
SELECT 
    dp.id,
    dp.document_id,
    dp.user_id,
    dp.role,
    dp.can_read,
    dp.can_write,
    dp.can_delete,
    dp.can_share,
    u.username,
    u.email,
    fsi.name as document_name
FROM document_permissions dp
LEFT JOIN users u ON dp.user_id = u.id
LEFT JOIN file_system_items fsi ON dp.document_id = fsi.id
ORDER BY dp.created_at DESC;

-- 2. 查看特定用户对特定文档的权限
-- 替换下面的 USER_ID 和 DOCUMENT_ID
-- SELECT 
--     dp.*,
--     u.username,
--     fsi.name as document_name
-- FROM document_permissions dp
-- LEFT JOIN users u ON dp.user_id = u.id
-- LEFT JOIN file_system_items fsi ON dp.document_id = fsi.id
-- WHERE dp.user_id = USER_ID 
--   AND dp.document_id = DOCUMENT_ID;

-- 3. 查看所有 editor 角色的权限
SELECT 
    dp.id,
    dp.document_id,
    dp.user_id,
    dp.role,
    dp.can_write,
    u.username,
    fsi.name as document_name
FROM document_permissions dp
LEFT JOIN users u ON dp.user_id = u.id
LEFT JOIN file_system_items fsi ON dp.document_id = fsi.id
WHERE dp.role = 'editor';

-- 4. 检查是否有 can_write = false 的 editor
SELECT 
    dp.id,
    dp.document_id,
    dp.user_id,
    dp.role,
    dp.can_write,
    u.username
FROM document_permissions dp
LEFT JOIN users u ON dp.user_id = u.id
WHERE dp.role = 'editor' AND dp.can_write = false;

-- 5. 修复错误的权限数据（如果 editor 的 can_write 为 false）
-- UPDATE document_permissions 
-- SET can_write = true 
-- WHERE role = 'editor' AND can_write = false;
