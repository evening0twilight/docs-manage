# 云服务商迁移指南

## 🚀 迁移优势

### 为什么选择国内云服务商？
1. **网络速度**：国内访问更快，延迟更低
2. **价格优势**：学生优惠，新用户折扣
3. **本土化服务**：中文支持，银联付款
4. **合规性**：符合国内法规要求

## 📋 迁移对比表

| 云服务商 | 最低配置价格 | 学生优惠 | 网络优势 | Docker 支持 |
|----------|-------------|----------|----------|-------------|
| **阿里云 ECS** | ¥99/月 | ¥9.5/月 | 国内最优 | ✅ 原生支持 |
| **腾讯云 CVM** | ¥95/月 | ¥10/月 | 游戏加速 | ✅ 原生支持 |
| **华为云 ECS** | ¥102/月 | ¥9/月 | 企业级 | ✅ 原生支持 |
| **DigitalOcean** | $12/月(¥85) | 无学生优惠 | 国外节点 | ✅ 原生支持 |

## 🔧 迁移步骤（超简单！）

### 步骤 1：购买新的云服务器
```bash
# 推荐配置（所有云服务商通用）
CPU: 2核
内存: 4GB
硬盘: 40GB SSD
操作系统: Ubuntu 22.04 LTS
带宽: 3-5Mbps
```

### 步骤 2：配置服务器（一键脚本）
```bash
# SSH 连接到新服务器
ssh root@新服务器IP

# 运行一键配置脚本
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 创建部署目录
mkdir -p /home/deploy
cd /home/deploy
```

### 步骤 3：部署应用（完全相同的命令）
```bash
# 克隆项目（与 DigitalOcean 完全一样）
git clone https://github.com/evening0twilight/docs-manage.git
cd docs-manage

# 配置环境变量（与 DigitalOcean 完全一样）
cp .env.production .env
nano .env  # 修改数据库密码和JWT密钥

# 启动应用（与 DigitalOcean 完全一样）
docker-compose up --build -d
```

### 步骤 4：更新前端配置
```javascript
// 只需要改一个IP地址！
// 原来：
const API_BASE_URL = 'http://digitalocean-ip/api';

// 改为：
const API_BASE_URL = 'http://新云服务器IP/api';
```

## 🤖 自动部署配置

### GitHub Secrets 配置

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加：

#### 阿里云配置
```
ALIYUN_HOST=你的阿里云服务器IP
ALIYUN_USER=root
ALIYUN_SSH_KEY=你的SSH私钥内容
ALIYUN_PORT=22
```

#### 腾讯云配置
```
TENCENT_HOST=你的腾讯云服务器IP
TENCENT_USER=root
TENCENT_SSH_KEY=你的SSH私钥内容
TENCENT_PORT=22
```

### 自动部署流程
1. **推送代码** → GitHub
2. **自动触发** → GitHub Actions
3. **自动构建** → Docker 镜像
4. **自动部署** → 云服务器
5. **零停机** → 滚动更新

## 📱 具体云服务商购买指南

### 阿里云 ECS
1. 访问：https://ecs.console.aliyun.com/
2. 选择：按量付费 或 包年包月
3. 地域：华东1（杭州）或 华北2（北京）
4. 实例规格：ecs.t5-lc1m2.small（2核4GB）
5. 镜像：Ubuntu 22.04 64位
6. 安全组：开放 22、80、443、3000 端口

### 腾讯云 CVM
1. 访问：https://console.cloud.tencent.com/cvm
2. 选择：按量计费 或 包年包月
3. 地域：北京 或 上海
4. 实例类型：标准型S5（2核4GB）
5. 镜像：Ubuntu Server 22.04 LTS 64位
6. 安全组：允许 SSH、HTTP、HTTPS

### 华为云 ECS
1. 访问：https://console.huaweicloud.com/ecm/
2. 选择：按需计费 或 包年/包月
3. 地域：华北-北京四 或 华东-上海一
4. 规格：s6.large.2（2核4GB）
5. 镜像：Ubuntu 22.04 server 64bit
6. 安全组：开放必要端口

## ⚡ 迁移时间估算

| 迁移步骤 | 预计耗时 | 难度 |
|----------|----------|------|
| 购买云服务器 | 5分钟 | ⭐ |
| 配置服务器环境 | 10分钟 | ⭐⭐ |
| 部署应用 | 5分钟 | ⭐ |
| 配置自动部署 | 15分钟 | ⭐⭐⭐ |
| 测试验证 | 10分钟 | ⭐⭐ |
| **总计** | **45分钟** | **简单** |

## 🔒 数据迁移（如果需要）

如果你已经在 DigitalOcean 上有用户数据：

```bash
# 在旧服务器上备份数据库
docker exec docs-mysql mysqldump -u root -p docs_manage > backup.sql

# 复制到新服务器
scp backup.sql root@新服务器IP:/home/deploy/

# 在新服务器上恢复数据
docker exec -i docs-mysql mysql -u root -p docs_manage < backup.sql
```

## 🎯 最佳实践建议

### 1. 多环境部署策略
- **开发环境**：DigitalOcean（测试用）
- **生产环境**：阿里云/腾讯云（正式用）

### 2. 成本优化
- **学生认证**：享受超低价格
- **按量付费**：开发阶段使用
- **包年付费**：生产环境使用

### 3. 监控和备份
- 设置云监控告警
- 定期自动备份数据库
- 配置日志收集

## 🆘 迁移支持

迁移过程中遇到问题？
1. **配置问题**：检查 `.env` 文件
2. **网络问题**：检查安全组设置
3. **部署问题**：查看 `docker-compose logs`
4. **自动部署问题**：检查 GitHub Secrets 配置

总的来说，迁移就是换个IP地址的事情！ 🎉