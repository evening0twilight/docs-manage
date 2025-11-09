#!/bin/bash

###############################################################################
# 生产环境快速修复脚本
# 用途: 修复当前生产环境的 Nginx 冲突和数据库表类型问题
# 执行: bash scripts/production-hotfix.sh
###############################################################################

set -e

echo "=========================================="
echo "🚀 生产环境快速修复"
echo "=========================================="
echo ""

# ========== 步骤 1: 清理系统 Nginx ==========
echo "步骤 1/5: 清理系统 Nginx..."
bash scripts/cleanup-system-nginx.sh
echo ""

# ========== 步骤 2: 删除错误的评论表 ==========
echo "步骤 2/5: 删除旧的 document_comments 表..."
docker exec -i docs-mysql mysql -u root -pSeem67wind123! docs-manage -e "DROP TABLE IF EXISTS document_comments;" 2>/dev/null || {
    echo "⚠️  删除表失败,可能表不存在,继续..."
}
echo "✅ 旧表已删除"
echo ""

# ========== 步骤 3: 停止应用容器 ==========
echo "步骤 3/5: 停止应用容器..."
cd /home/deploy/docs-manage
docker-compose stop app
echo "✅ 应用已停止"
echo ""

# ========== 步骤 4: 拉取最新代码并重新构建 ==========
echo "步骤 4/5: 拉取最新代码..."
git pull origin main
echo "✅ 代码已更新"
echo ""

echo "重新构建应用镜像..."
docker-compose build app
echo "✅ 镜像构建完成"
echo ""

# ========== 步骤 5: 启动所有服务 ==========
echo "步骤 5/5: 启动所有服务..."
docker-compose up -d
echo "✅ 服务已启动"
echo ""

# ========== 等待服务启动 ==========
echo "等待服务启动(10秒)..."
sleep 10

# ========== 验证服务状态 ==========
echo ""
echo "=========================================="
echo "🔍 验证服务状态"
echo "=========================================="

echo ""
echo "容器状态:"
docker-compose ps

echo ""
echo "测试应用连接:"
if curl -f -s -I http://localhost:3000/api/users/login > /dev/null 2>&1; then
    echo "✅ 应用服务正常"
else
    echo "⚠️  应用服务异常,查看日志:"
    docker logs docs-app --tail 20
fi

echo ""
echo "测试 Nginx 代理:"
if curl -f -s -I http://localhost/api/users/login > /dev/null 2>&1; then
    echo "✅ Nginx 代理正常"
else
    echo "⚠️  Nginx 代理异常,查看日志:"
    docker logs docs-nginx --tail 20
fi

echo ""
echo "=========================================="
echo "✅ 修复完成!"
echo "=========================================="
echo ""
echo "如果服务仍有问题,请查看详细日志:"
echo "  docker logs docs-app"
echo "  docker logs docs-nginx"
echo "  docker logs docs-mysql"
