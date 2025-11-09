#!/bin/bash

###############################################################################
# 清理系统级 Nginx 脚本
# 用途: 在部署前清理可能占用 80/443 端口的系统 Nginx
# 执行: bash scripts/cleanup-system-nginx.sh
###############################################################################

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🔍 检查系统 Nginx 状态"
echo "=========================================="

# 检查系统 Nginx 是否安装
if command -v nginx &> /dev/null; then
    echo "⚠️  检测到系统级 Nginx 已安装"
    
    # 检查端口 80 是否被占用
    if sudo lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ 端口 80 被占用,正在清理..."
        
        # 停止 Nginx 服务
        echo "   → 停止 Nginx 服务..."
        sudo systemctl stop nginx 2>/dev/null || true
        
        # 禁用开机自启
        echo "   → 禁用 Nginx 开机自启..."
        sudo systemctl disable nginx 2>/dev/null || true
        
        # 永久禁用(防止更新后重新启用)
        echo "   → 永久禁用 Nginx..."
        sudo systemctl mask nginx 2>/dev/null || true
        
        # 卸载 Nginx
        echo "   → 卸载 Nginx 软件包..."
        sudo apt-get remove --purge nginx nginx-common nginx-core -y 2>/dev/null || true
        sudo apt-get autoremove -y 2>/dev/null || true
        
        echo "✅ 系统 Nginx 已清理完成"
    else
        echo "✅ 端口 80 未被占用,无需清理"
    fi
else
    echo "✅ 未检测到系统 Nginx,无需清理"
fi

# 再次检查端口状态
echo ""
echo "=========================================="
echo "🔍 验证端口状态"
echo "=========================================="

if sudo lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 80 仍被占用:"
    sudo lsof -Pi :80 -sTCP:LISTEN
    echo ""
    echo "请手动检查并停止占用端口的进程"
    exit 1
else
    echo "✅ 端口 80 可用"
fi

if sudo lsof -Pi :443 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 443 被占用:"
    sudo lsof -Pi :443 -sTCP:LISTEN
    echo ""
    echo "这可能不影响部署,但建议检查"
else
    echo "✅ 端口 443 可用"
fi

echo ""
echo "=========================================="
echo "✅ 端口清理完成,可以部署 Docker 服务了"
echo "=========================================="
