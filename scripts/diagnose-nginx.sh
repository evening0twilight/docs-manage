#!/bin/bash

echo "🔍 诊断Nginx问题..."
echo ""

# 1. 检查系统Nginx状态
echo "=== 系统Nginx状态 ==="
sudo systemctl status nginx --no-pager

echo ""
echo "=== Nginx错误日志(最后20行) ==="
sudo tail -n 20 /var/log/nginx/error.log

echo ""
echo "=== 检查前端目录 ==="
if [ -d "/var/www/docs-platform/dist" ]; then
    echo "✅ 前端目录存在"
    ls -la /var/www/docs-platform/dist/ | head -10
else
    echo "❌ 前端目录不存在: /var/www/docs-platform/dist"
fi

echo ""
echo "=== 端口监听状态 ==="
sudo ss -tlnp | grep -E ':(80|443|8080|8443) '

echo ""
echo "=== Docker容器状态 ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== 测试本地访问 ==="
echo "HTTP 80端口:"
curl -I http://localhost 2>&1 | head -5
echo ""
echo "HTTPS 443端口:"
curl -I -k https://localhost 2>&1 | head -5
echo ""
echo "后端API 8080端口:"
curl -I http://localhost:8080/api 2>&1 | head -5
