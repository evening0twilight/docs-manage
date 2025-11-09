#!/bin/bash

# 部署脚本 - 在服务器上运行

echo "开始部署文档管理系统..."

# ========== 第一步: 清理系统 Nginx ==========
echo ""
echo "=========================================="
echo "清理系统级 Nginx(防止端口冲突)..."
echo "=========================================="
bash scripts/cleanup-system-nginx.sh

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要的软件
sudo apt install -y curl git ufw

# 安装 Docker
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# 安装 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "安装 Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 配置防火墙
echo "配置防火墙..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 克隆项目
if [ ! -d "docs-manage" ]; then
    echo "克隆项目..."
    git clone https://github.com/your-username/docs-manage.git
fi

cd docs-manage

# 创建生产环境变量文件
if [ ! -f ".env" ]; then
    echo "创建环境变量文件..."
    cp .env.production .env
    
    echo "请编辑 .env 文件设置生产环境变量："
    echo "  - 数据库密码"
    echo "  - JWT 密钥"
    echo "  - CORS 域名"
    echo ""
    echo "编辑完成后按回车继续..."
    read
fi

# 构建和启动服务
echo "构建和启动服务..."
docker-compose down
docker-compose up --build -d

echo "部署完成！"
echo "应用运行在: http://your-server-ip"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
echo "重启服务: docker-compose restart"