#!/bin/bash

###############################################################################
# 数据库表修复脚本
# 用途: 删除错误的 document_comments 表,让 TypeORM 重新创建
# 执行: bash scripts/fix-comment-table.sh
###############################################################################

set -e

echo "=========================================="
echo "🔧 修复 document_comments 表类型问题"
echo "=========================================="
echo ""

# 数据库连接信息
DB_CONTAINER="docs-mysql"
DB_ROOT_PASSWORD="Seem67wind123!"
DB_NAME="docs-manage"

echo "步骤 1: 检查表是否存在..."
TABLE_EXISTS=$(docker exec -i $DB_CONTAINER mysql -u root -p$DB_ROOT_PASSWORD $DB_NAME -se "SHOW TABLES LIKE 'document_comments';" 2>/dev/null)

if [ -z "$TABLE_EXISTS" ]; then
    echo "✅ 表不存在,无需删除"
else
    echo "⚠️  表存在,准备删除..."
    
    # 显示当前表结构
    echo ""
    echo "当前表结构:"
    docker exec -i $DB_CONTAINER mysql -u root -p$DB_ROOT_PASSWORD $DB_NAME -e "DESCRIBE document_comments;" 2>/dev/null
    
    # 备份数据(如果有)
    echo ""
    echo "步骤 2: 检查是否有数据需要备份..."
    ROW_COUNT=$(docker exec -i $DB_CONTAINER mysql -u root -p$DB_ROOT_PASSWORD $DB_NAME -se "SELECT COUNT(*) FROM document_comments WHERE deleted_at IS NULL;" 2>/dev/null)
    
    if [ "$ROW_COUNT" -gt 0 ]; then
        echo "⚠️  表中有 $ROW_COUNT 条数据,正在备份..."
        BACKUP_FILE="backup_document_comments_$(date +%Y%m%d_%H%M%S).sql"
        docker exec -i $DB_CONTAINER mysqldump -u root -p$DB_ROOT_PASSWORD $DB_NAME document_comments > "/tmp/$BACKUP_FILE" 2>/dev/null
        echo "✅ 数据已备份到: /tmp/$BACKUP_FILE"
    else
        echo "✅ 表中无数据,无需备份"
    fi
    
    # 删除表
    echo ""
    echo "步骤 3: 删除旧表..."
    docker exec -i $DB_CONTAINER mysql -u root -p$DB_ROOT_PASSWORD $DB_NAME -e "DROP TABLE IF EXISTS document_comments;" 2>/dev/null
    echo "✅ 旧表已删除"
fi

echo ""
echo "步骤 4: 重启应用让 TypeORM 重新创建表..."
cd /home/deploy/docs-manage
docker-compose restart app

echo ""
echo "等待应用启动(15秒)..."
sleep 15

echo ""
echo "步骤 5: 验证新表结构..."
docker exec -i $DB_CONTAINER mysql -u root -p$DB_ROOT_PASSWORD $DB_NAME -e "DESCRIBE document_comments;" 2>/dev/null

echo ""
echo "=========================================="
echo "✅ 表修复完成!"
echo "=========================================="
echo ""
echo "新表字段类型:"
echo "  - id: INT UNSIGNED"
echo "  - document_id: INT UNSIGNED"
echo "  - user_id: INT UNSIGNED"
echo "  - resolved_by: INT UNSIGNED (nullable)"
echo "  - parent_id: INT UNSIGNED (nullable)"
