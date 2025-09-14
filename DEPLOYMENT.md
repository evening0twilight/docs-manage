# 部署指南

## 部署到 DigitalOcean

### 1. 准备工作

1. **GitHub 仓库**：确保代码已推送到 GitHub
2. **DigitalOcean 账户**：注册并创建 Droplet
3. **域名**（可选）：如果需要自定义域名

### 2. DigitalOcean Droplet 配置

**推荐配置**：
- **镜像**：Ubuntu 22.04 LTS
- **规格**：Basic Droplet, 2GB RAM, 1 vCPU, 50GB SSD
- **数据中心**：选择距离用户最近的区域
- **防火墙**：开放 22 (SSH), 80 (HTTP), 443 (HTTPS) 端口

### 3. 服务器初始化

```bash
# 连接到服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 创建新用户（推荐）
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 4. 部署应用

```bash
# 克隆项目
git clone https://github.com/your-username/docs-manage.git
cd docs-manage

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 5. 配置环境变量

编辑 `.env` 文件：

```bash
nano .env
```

**重要配置项**：
```env
# 数据库配置
DB_USERNAME=docs_user
DB_PASSWORD=your_secure_password_here
DB_DATABASE=docs_manage

# JWT 配置（必须更改）
JWT_SECRET=your_very_secure_jwt_secret_key_here

# CORS 配置（前端域名）
CORS_ORIGIN=http://your-frontend-domain.com

# 如果使用域名
# CORS_ORIGIN=https://your-domain.com
```

### 6. 启动服务

```bash
# 构建并启动所有服务
docker-compose up --build -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 7. 验证部署

访问：`http://your-server-ip/api`

应该看到：
```json
{
  "message": "文档管理系统 API",
  "version": "1.0.0"
}
```

### 8. 前端联调配置

在前端项目中，将 API 基础 URL 设置为：
```javascript
// 开发环境
const API_BASE_URL = 'http://localhost:3000/api';

// 生产环境
const API_BASE_URL = 'http://your-server-ip/api';
// 或者使用域名
const API_BASE_URL = 'https://your-domain.com/api';
```

### 9. 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service-name]

# 重启服务
docker-compose restart [service-name]

# 停止所有服务
docker-compose down

# 更新代码后重新部署
git pull origin main
docker-compose up --build -d
```

### 10. SSL 证书配置（可选）

如果有域名，可以使用 Let's Encrypt 配置 HTTPS：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 11. 监控和维护

```bash
# 查看系统资源使用
htop
df -h
free -h

# 查看 Docker 使用情况
docker system df
docker-compose logs --tail=100 -f
```

### 故障排除

1. **端口被占用**：
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **数据库连接失败**：
   ```bash
   docker-compose logs mysql
   docker-compose restart mysql
   ```

3. **应用启动失败**：
   ```bash
   docker-compose logs app
   # 检查环境变量配置
   ```

### 性能优化

1. **启用 Gzip 压缩**（已配置在 Nginx）
2. **数据库优化**：
   ```sql
   # 创建索引
   CREATE INDEX idx_documents_author ON documents(authorId);
   CREATE INDEX idx_documents_created ON documents(createdAt);
   ```

3. **缓存配置**：考虑使用 Redis 缓存

### 安全建议

1. **更改默认密码**：数据库和 JWT 密钥
2. **启用防火墙**：只开放必要端口
3. **定期更新**：系统和依赖包
4. **备份数据**：定期备份数据库
5. **使用 HTTPS**：生产环境必须启用