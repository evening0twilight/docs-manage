# 📚 文档管理系统 (Docs Management System)

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
</p>

<p align="center">
  基于 NestJS + TypeORM + MySQL 的企业级文档管理系统后端
</p>

<p align="center">
  <a href="#features">功能特性</a> •
  <a href="#tech-stack">技术栈</a> •
  <a href="#quick-start">快速开始</a> •
  <a href="#deployment">部署指南</a> •
  <a href="#api-docs">API 文档</a>
</p>

---

## 📋 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [开发指南](#开发指南)
- [部署指南](#部署指南)
- [API 文档](#api-文档)
- [数据库设计](#数据库设计)
- [测试](#测试)
- [常见问题](#常见问题)

---

## 🎯 项目简介

文档管理系统是一个功能完整的企业级文档管理解决方案，支持文档的创建、编辑、分享、权限管理等核心功能。采用前后端分离架构，本项目为后端服务。

### 核心功能
- 📁 **文件夹层级管理** - 支持无限层级的文件夹结构
- 📄 **多类型文档** - 支持文本、图片、Word、Excel 等多种文档类型
- 👥 **用户权限管理** - 完善的用户认证和授权机制
- 🔐 **JWT 认证** - 安全的身份验证和令牌刷新
- 📧 **邮件服务** - 验证码、密码重置等邮件通知
- 📊 **文档统计** - 实时查看文档数据和用户行为
- 🗑️ **回收站** - 软删除机制，支持文档恢复
- ☁️ **云存储集成** - 腾讯云 COS 文件存储
- 🔍 **全文搜索** - 快速定位文档内容
- 📱 **响应式设计** - 完美支持移动端访问

---

## ✨ 功能特性

### 用户模块
- ✅ 用户注册/登录（支持邮箱验证码）
- ✅ JWT 令牌认证（Access Token + Refresh Token）
- ✅ 密码加密存储（bcrypt）
- ✅ 密码重置（邮件验证）
- ✅ 用户资料管理
- ✅ 头像上传

### 文档模块
- ✅ 文档 CRUD 操作
- ✅ 文件夹创建与管理
- ✅ 文档层级结构（树形展示）
- ✅ 文档权限控制（私有/共享/公开）
- ✅ 文档软删除（回收站）
- ✅ 批量操作（移动、删除、恢复）
- ✅ 文档搜索与筛选
- ✅ 文档排序

### 邮件服务
- ✅ 注册验证码发送
- ✅ 密码重置邮件
- ✅ 邮件发送限流（防止滥用）
- ✅ 邮件模板管理
- ✅ 发送统计与监控

### 文件上传
- ✅ 腾讯云 COS 集成
- ✅ 文件大小限制
- ✅ 文件类型验证
- ✅ 缩略图生成
- ✅ 批量上传

### 系统管理
- ✅ 日志查看（应用日志、数据库日志）
- ✅ 系统监控
- ✅ 数据库健康检查
- ✅ API 文档（Swagger）

---

## 🛠️ 技术栈

### 核心框架
- **[NestJS](https://nestjs.com/)** - 企业级 Node.js 框架
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript 超集
- **[TypeORM](https://typeorm.io/)** - 优雅的 ORM 框架

### 数据库
- **[MySQL 8.0](https://www.mysql.com/)** - 关系型数据库

### 认证授权
- **[Passport](http://www.passportjs.org/)** - 身份认证中间件
- **[JWT](https://jwt.io/)** - JSON Web Token
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** - 密码加密

### 文件存储
- **[腾讯云 COS](https://cloud.tencent.com/product/cos)** - 对象存储服务
- **[Multer](https://github.com/expressjs/multer)** - 文件上传中间件

### 邮件服务
- **[Resend](https://resend.com/)** - 现代化邮件发送服务
- **[Nodemailer](https://nodemailer.com/)** - 备用邮件方案

### 开发工具
- **[ESLint](https://eslint.org/)** - 代码规范检查
- **[Prettier](https://prettier.io/)** - 代码格式化
- **[Jest](https://jestjs.io/)** - 单元测试框架
- **[Swagger](https://swagger.io/)** - API 文档生成

### 部署运维
- **[Docker](https://www.docker.com/)** - 容器化部署
- **[Docker Compose](https://docs.docker.com/compose/)** - 多容器编排
- **[Nginx](https://nginx.org/)** - 反向代理服务器
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD 自动化部署

---

## 📂 项目结构

```
docs-manage/
├── src/                          # 源代码目录
│   ├── main.ts                   # 应用入口文件
│   ├── app.module.ts             # 根模块
│   ├── app.controller.ts         # 根控制器
│   ├── app.service.ts            # 根服务
│   │
│   ├── config/                   # 配置文件
│   │   ├── env.ts                # 环境变量配置
│   │   ├── index.ts              # 配置导出
│   │   └── validation.ts         # 配置验证
│   │
│   ├── common/                   # 公共模块
│   │   ├── dto/                  # 数据传输对象
│   │   │   ├── pagination.dto.ts # 分页 DTO
│   │   │   ├── response.dto.ts   # 响应格式 DTO
│   │   │   └── error.dto.ts      # 错误信息 DTO
│   │   │
│   │   ├── filters/              # 全局过滤器
│   │   │   └── global-exception.filter.ts
│   │   │
│   │   ├── mail/                 # 邮件服务模块
│   │   │   ├── mail.module.ts
│   │   │   ├── mail.service.ts
│   │   │   ├── mail.config.ts
│   │   │   ├── email-verification.service.ts
│   │   │   ├── mail-quota.service.ts
│   │   │   ├── mail-rate-limit.service.ts
│   │   │   ├── entities/
│   │   │   │   └── mail-stats.entity.ts
│   │   │   └── templates/
│   │   │       ├── verification-code.template.ts
│   │   │       └── reset-password.template.ts
│   │   │
│   │   └── upload/               # 文件上传模块
│   │       ├── upload.module.ts
│   │       ├── upload.service.ts
│   │       ├── upload.controller.ts
│   │       └── cos.config.ts
│   │
│   ├── users/                    # 用户模块
│   │   ├── users.module.ts
│   │   ├── users.controller.ts   # 用户控制器
│   │   ├── users.service.ts      # 用户服务
│   │   ├── user.entity.ts        # 用户实体
│   │   ├── dto/                  # 用户相关 DTO
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   ├── auth.dto.ts
│   │   │   ├── password.dto.ts
│   │   │   └── email-verification.dto.ts
│   │   ├── guards/               # 守卫
│   │   │   └── jwt-auth.guard.ts
│   │   └── strategies/           # 认证策略
│   │       └── jwt.strategy.ts
│   │
│   ├── document/                 # 文档模块
│   │   ├── document.module.ts
│   │   ├── document.controller.ts
│   │   ├── document.service.ts
│   │   ├── document.entity.ts    # 文档实体
│   │   ├── dto/                  # 文档相关 DTO
│   │   │   ├── create-document.dto.ts
│   │   │   ├── update-document.dto.ts
│   │   │   ├── query-document.dto.ts
│   │   │   ├── permission.dto.ts
│   │   │   └── upload.dto.ts
│   │   └── interfaces/
│   │       └── docs.interface.ts
│   │
│   └── logs/                     # 日志模块
│       ├── logs.module.ts
│       └── logs.controller.ts
│
├── scripts/                      # 脚本目录
│   └── seed-documents.ts         # 数据库种子脚本
│
├── mysql/                        # MySQL 配置
│   └── init/                     # 数据库初始化脚本
│       ├── 01-init.sql
│       └── 02-email-verification.sql
│
├── nginx/                        # Nginx 配置
│   └── nginx.conf
│
├── docs/                         # 文档目录
│   ├── USER_PROFILE.md
│   └── expense.md                # 答辩文档
│
├── test/                         # 测试文件
│   ├── app.e2e-spec.ts
│   ├── config.spec.ts
│   └── jest-e2e.json
│
├── public/                       # 静态资源
│   └── logs.html
│
├── .env                          # 环境变量（本地开发）
├── .env.production               # 环境变量（生产环境）
├── .gitignore                    # Git 忽略文件
├── docker-compose.yml            # Docker 编排文件
├── Dockerfile                    # Docker 镜像构建文件
├── deploy.sh                     # 部署脚本
├── start.sh                      # 启动脚本
├── nest-cli.json                 # NestJS CLI 配置
├── tsconfig.json                 # TypeScript 配置
├── tsconfig.build.json           # TypeScript 构建配置
├── eslint.config.mjs             # ESLint 配置
├── package.json                  # 项目依赖
├── pnpm-lock.yaml                # 依赖锁定文件
└── README.md                     # 项目说明文档
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **MySQL** >= 8.0
- **Git**

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/evening0twilight/docs-manage.git
cd docs-manage
```

#### 2. 安装依赖

```bash
pnpm install
```

#### 3. 配置环境变量

复制 `.env.example` 并重命名为 `.env`，配置以下信息：

```env
# ========== 应用配置 ==========
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# ========== 数据库配置 ==========
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=docs-manage

# ========== JWT 配置 ==========
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ========== 邮件服务配置 ==========
MAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=onboarding@yourdomain.com

# ========== 腾讯云 COS 配置 ==========
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_BUCKET=your-bucket-name
COS_REGION=ap-guangzhou
COS_DOMAIN=https://your-bucket.cos.region.myqcloud.com
```

#### 4. 初始化数据库

```bash
# 方式 1: 使用 MySQL 客户端导入
mysql -u root -p docs-manage < mysql/init/01-init.sql
mysql -u root -p docs-manage < mysql/init/02-email-verification.sql

# 方式 2: 使用 Docker Compose 自动初始化
docker-compose up -d mysql
```

#### 5. 生成测试数据（可选）

```bash
# 生成 10 条测试数据
npx ts-node scripts/seed-documents.ts 10
```

#### 6. 启动开发服务器

```bash
pnpm run start:dev
```

服务启动后访问：
- **应用地址**: http://localhost:3000
- **API 文档**: http://localhost:3000/api-docs
- **日志查看**: http://localhost:3000/logs.html

---

## ⚙️ 环境配置

### 开发环境

```bash
# 启动开发服务器（热重载）
pnpm run start:dev

# 启动调试模式
pnpm run start:debug
```

### 生产环境

```bash
# 构建项目
pnpm run build

# 启动生产服务器
pnpm run start:prod
```

### Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

---

## 💻 开发指南

### 代码规范

```bash
# 代码格式化
pnpm run format

# 代码检查
pnpm run lint

# 自动修复问题
pnpm run lint --fix
```

### 创建新模块

```bash
# 创建完整模块（包含 controller, service, module）
nest g resource module-name

# 创建单独的控制器
nest g controller controller-name

# 创建单独的服务
nest g service service-name
```

### 数据库迁移

```bash
# 生成迁移文件
pnpm typeorm migration:generate -- -n MigrationName

# 运行迁移
pnpm typeorm migration:run

# 回滚迁移
pnpm typeorm migration:revert
```

### 数据种子脚本

```bash
# 本地数据库生成测试数据
npx ts-node scripts/seed-documents.ts 10

# 生产数据库生成测试数据
npx ts-node scripts/seed-documents.ts 10 --prod
```

**支持的参数：**
- 第一个参数：生成数据条数（默认 10）
- `--prod`：连接生产数据库

**生成规则：**
- 30% 文件夹，70% 文档
- 随机分配父目录（70% 概率）
- 随机文档类型（text/image/word/excel/other）
- 缩略图 URL 为空（可自定义）
- sortOrder=0, creatorId=1, isDeleted=false（可恢复原随机逻辑）

---

## 🚢 部署指南

### 手动部署

#### 1. 服务器准备

```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. 配置防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable
```

#### 3. 克隆项目并配置

```bash
cd /home/deploy
git clone https://github.com/evening0twilight/docs-manage.git
cd docs-manage

# 创建生产环境配置
cp .env.example .env
nano .env  # 编辑配置
```

#### 4. 启动服务

```bash
sudo docker-compose up -d
```

### 自动化部署（GitHub Actions）

项目已配置 CI/CD 自动部署，推送到 `main`、`master` 或 `dev-pzj` 分支时自动触发：

1. **代码检查和构建**
2. **SSH 连接服务器**
3. **拉取最新代码**
4. **重新构建 Docker 镜像**
5. **重启服务**

**配置 GitHub Secrets:**

在 GitHub 仓库设置中添加以下 Secrets：

- `SERVER_HOST`: 服务器 IP 地址
- `SERVER_USER`: SSH 用户名（通常为 root）
- `SERVER_SSH_KEY`: SSH 私钥
- `SERVER_PORT`: SSH 端口（默认 22）

### Nginx 配置（可选）

如果需要使用域名和 HTTPS，配置 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📖 API 文档

### Swagger 文档

启动应用后访问：http://localhost:3000/api-docs

### 主要 API 端点

#### 认证相关

```
POST   /api/users/register              # 用户注册
POST   /api/users/login                 # 用户登录
POST   /api/users/refresh               # 刷新令牌
POST   /api/users/send-verification-code # 发送验证码
POST   /api/users/register-with-code    # 验证码注册
POST   /api/users/reset-password        # 重置密码
```

#### 用户管理

```
GET    /api/users                       # 获取用户列表
GET    /api/users/:id                   # 获取用户详情
GET    /api/users/profile               # 获取当前用户信息
PUT    /api/users/profile               # 更新用户信息
PUT    /api/users/password              # 修改密码
POST   /api/users/avatar                # 上传头像
DELETE /api/users/:id                   # 删除用户
```

#### 文档管理

```
POST   /api/documents                   # 创建文档
GET    /api/documents                   # 获取文档列表
GET    /api/documents/:id               # 获取文档详情
PUT    /api/documents/:id               # 更新文档
DELETE /api/documents/:id               # 删除文档（软删除）
POST   /api/documents/batch             # 批量操作
GET    /api/documents/tree              # 获取文档树
```

#### 文件夹管理

```
POST   /api/documents/folders           # 创建文件夹
GET    /api/documents/folders/:parentId/contents  # 获取文件夹内容
GET    /api/documents/folders/:folderId/path      # 获取文件夹路径
```

#### 文件上传

```
POST   /api/upload                      # 上传文件
```

#### 日志查看

```
GET    /api/logs                        # 获取所有日志
GET    /api/logs/app                    # 获取应用日志
GET    /api/logs/mysql                  # 获取数据库日志
GET    /api/logs/status                 # 获取日志状态
```

---

## 🗄️ 数据库设计

### users 表（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| email | VARCHAR(100) | 邮箱（唯一） |
| password | VARCHAR(255) | 加密密码 |
| avatar | VARCHAR(500) | 头像 URL |
| phone | VARCHAR(20) | 手机号 |
| createdAt | DATETIME | 创建时间 |
| updatedAt | DATETIME | 更新时间 |

### file_system_items 表（文档/文件夹表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| name | VARCHAR(255) | 文档/文件夹名称 |
| itemType | ENUM | 类型（folder/document） |
| documentType | ENUM | 文档类型（text/image/word/excel/other） |
| author | VARCHAR(100) | 作者 |
| content | TEXT | 文档内容 |
| thumb_url | VARCHAR(500) | 缩略图 URL |
| description | TEXT | 描述 |
| parentId | INT | 父文件夹 ID（外键） |
| creatorId | INT | 创建者 ID（外键） |
| sortOrder | INT | 排序顺序 |
| visibility | ENUM | 可见性（private/shared/public） |
| isDeleted | BOOLEAN | 是否删除 |
| createdAt | DATETIME | 创建时间 |
| updatedAt | DATETIME | 更新时间 |

### email_verifications 表（邮箱验证表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| email | VARCHAR(100) | 邮箱 |
| code | VARCHAR(10) | 验证码 |
| purpose | ENUM | 用途（register/reset_password） |
| expiresAt | DATETIME | 过期时间 |
| isUsed | BOOLEAN | 是否已使用 |
| createdAt | DATETIME | 创建时间 |

### mail_stats 表（邮件统计表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| email | VARCHAR(100) | 收件人邮箱 |
| type | VARCHAR(50) | 邮件类型 |
| status | ENUM | 状态（pending/sent/failed） |
| errorMessage | TEXT | 错误信息 |
| sentAt | DATETIME | 发送时间 |
| createdAt | DATETIME | 创建时间 |

---

## 🧪 测试

### 运行测试

```bash
# 单元测试
pnpm run test

# 端到端测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:cov

# 监听模式
pnpm run test:watch
```

### 测试结构

```
test/
├── app.e2e-spec.ts      # 端到端测试
├── config.spec.ts       # 配置测试
└── jest-e2e.json        # E2E 测试配置
```

---

## ❓ 常见问题

### 1. 数据库连接失败

**问题**: `ER_ACCESS_DENIED_ERROR: Access denied for user`

**解决方案**:
- 检查 `.env` 文件中的数据库配置
- 确认 MySQL 服务已启动
- 验证用户名和密码是否正确

### 2. 邮件发送失败

**问题**: `RESEND_API_KEY 未配置`

**解决方案**:
- 在 `.env` 文件中配置 `RESEND_API_KEY`
- 到 https://resend.com 获取 API Key
- 确认 `RESEND_FROM` 邮箱已验证

### 3. 文件上传失败

**问题**: 腾讯云 COS 上传失败

**解决方案**:
- 检查 COS 配置（SecretId、SecretKey、Bucket、Region）
- 确认 COS Bucket 已创建且有权限
- 检查文件大小是否超过限制（默认 10MB）

### 4. Docker 容器无法启动

**问题**: `Error response from daemon`

**解决方案**:
```bash
# 清理 Docker 资源
docker system prune -a

# 重新构建镜像
docker-compose up --build -d

# 查看日志排查问题
docker-compose logs -f app
```

### 5. 端口占用

**问题**: `Port 3000 is already in use`

**解决方案**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# 或修改 .env 中的 PORT 配置
```

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📞 联系方式

- **项目地址**: https://github.com/evening0twilight/docs-manage
- **问题反馈**: https://github.com/evening0twilight/docs-manage/issues
- **作者**: evening0twilight

---

## 🙏 致谢

感谢以下开源项目：

- [NestJS](https://nestjs.com/) - 优秀的 Node.js 框架
- [TypeORM](https://typeorm.io/) - 强大的 ORM 工具
- [Resend](https://resend.com/) - 现代化邮件服务
- [腾讯云 COS](https://cloud.tencent.com/product/cos) - 稳定的对象存储服务

---

<p align="center">
  Made with ❤️ by evening0twilight
</p>
