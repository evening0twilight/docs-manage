#!/bin/bash

echo "🔄 恢复系统Nginx并配置端口分离..."

# 1. 取消mask状态
echo "📝 Step 1: 取消Nginx mask状态..."
sudo systemctl unmask nginx

# 2. 安装Nginx(如果未安装)
echo "📝 Step 2: 确保Nginx已安装..."
sudo apt update
sudo apt install nginx -y

# 3. 停止Docker Nginx容器(释放80/443端口)
echo "📝 Step 3: 停止Docker Nginx容器..."
cd /home/deploy/docs-manage
docker-compose stop nginx

# 4. 配置系统Nginx为前端+反向代理
echo "📝 Step 4: 配置系统Nginx..."
sudo tee /etc/nginx/sites-available/docs-platform > /dev/null <<'EOF'
# 前端静态文件 + 后端API反向代理
server {
    listen 80;
    server_name onespecial.me www.onespecial.me;
    
    # 前端静态文件根目录
    root /var/www/docs-platform/dist;
    index index.html;

    # 前端路由(Vue Router history模式)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端API反向代理到Docker Nginx(8080端口)
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket支持
    location /socket.io {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name onespecial.me www.onespecial.me;

    ssl_certificate /etc/letsencrypt/live/onespecial.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onespecial.me/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/docs-platform/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://localhost:8443;
        proxy_ssl_verify off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass https://localhost:8443;
        proxy_ssl_verify off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 5. 启用站点配置
echo "📝 Step 5: 启用站点配置..."
sudo ln -sf /etc/nginx/sites-available/docs-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 6. 测试Nginx配置
echo "📝 Step 6: 测试Nginx配置..."
sudo nginx -t

# 7. 启动系统Nginx
echo "📝 Step 7: 启动系统Nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

# 8. 启动Docker Nginx(新端口8080/8443)
echo "📝 Step 8: 启动Docker Nginx容器..."
docker-compose up -d nginx

# 9. 验证服务状态
echo "📝 Step 9: 验证服务状态..."
echo ""
echo "系统Nginx状态:"
sudo systemctl status nginx --no-pager | head -5
echo ""
echo "Docker Nginx状态:"
docker ps | grep docs-nginx
echo ""
echo "端口占用情况:"
sudo netstat -tlnp | grep -E ':(80|443|8080|8443) '

echo ""
echo "✅ 配置完成!"
echo ""
echo "📌 架构说明:"
echo "  - 系统Nginx (80/443) → 前端静态文件 + 反向代理"
echo "  - Docker Nginx (8080/8443) → 后端API"
echo "  - 用户访问 https://onespecial.me → 前端页面"
echo "  - 前端调用 https://onespecial.me/api → 自动代理到后端"
