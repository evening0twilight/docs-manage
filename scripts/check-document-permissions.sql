-- 检查文档权限数据完整性

-- 1. 查看所有文档的基本信息
SELECT 
    id,
    name,
    item_type,
    document_type,
    visibility,
    creator_id,
    is_deleted,
    created_time
FROM file_system_items
WHERE is_deleted = false
ORDER BY creator_id, id;

-- 2. 检查是否存在 visibility 为 NULL 的文档
SELECT 
    id,
    name,
    visibility,
    creator_id
FROM file_system_items
WHERE is_deleted = false
  AND visibility IS NULL;

-- 3. 检查是否存在 creator_id 为 NULL 的文档
SELECT 
    id,
    name,
    visibility,
    creator_id
FROM file_system_items
WHERE is_deleted = false
  AND creator_id IS NULL;

-- 4. 按用户统计文档数量
SELECT 
    creator_id,
    visibility,
    COUNT(*) as doc_count
FROM file_system_items
WHERE is_deleted = false
  AND item_type = 'document'
GROUP BY creator_id, visibility
ORDER BY creator_id, visibility;

-- 5. 查找可能有问题的文档（visibility为private但创建者可能有问题）
SELECT 
    fsi.id,
    fsi.name,
    fsi.visibility,
    fsi.creator_id,
    u.username,
    u.email
FROM file_system_items fsi
LEFT JOIN users u ON fsi.creator_id = u.id
WHERE fsi.is_deleted = false
  AND fsi.visibility = 'private'
ORDER BY fsi.creator_id, fsi.id;
