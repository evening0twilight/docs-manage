# Apifox 测试指南 - 文档管理系统

## 🚀 启动项目

### 1. 启动开发服务器
```bash
cd e:\桌面\毕设\docs-manage
npm run start:dev
```

服务器将在 `http://localhost:3000` 启动

### 2. 验证服务器状态
打开浏览器访问: `http://localhost:3000`
应该看到 "Hello World!" 或类似的响应

## 🔧 Apifox 配置

### 1. 创建新项目
- 打开 Apifox
- 创建新项目：`文档管理系统API测试`
- 设置 Base URL: `http://localhost:3000`

### 2. 环境变量设置
在 Apifox 中设置以下环境变量：
- `baseUrl`: `http://localhost:3000`
- `token`: (登录后获取的JWT token，初始留空)

## 📋 测试流程

### 第一阶段：用户认证测试

#### 1. 用户注册
```
POST {{baseUrl}}/users/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "123456",
  "confirmPassword": "123456"
}
```

**预期响应:**
```json
{
  "success": true,
  "message": "用户注册成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "isActive": true,
    "createdAt": "2025-01-13T...",
    "updatedAt": "2025-01-13T..."
  },
  "statusCode": 201
}
```

#### 2. 用户登录
```
POST {{baseUrl}}/users/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "123456"
}
```

**预期响应:**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    }
  },
  "statusCode": 200
}
```

**⚠️ 重要**: 复制 `access_token` 的值，更新 Apifox 环境变量中的 `token`

### 第二阶段：文档功能测试（需要认证）

#### 3. 创建文档
```
POST {{baseUrl}}/documents
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "我的第一个文档",
  "content": "这是文档的内容",
  "type": "text",
  "visibility": "private"
}
```

**预期响应:**
```json
{
  "success": true,
  "message": "文档创建成功",
  "data": {
    "id": 1,
    "title": "我的第一个文档",
    "content": "这是文档的内容",
    "creatorId": 1,
    "visibility": "private",
    "type": 1,
    "created_time": "2025-01-13T...",
    "updated_time": "2025-01-13T..."
  },
  "statusCode": 201
}
```

#### 4. 获取文档列表
```
GET {{baseUrl}}/documents?page=1&limit=10
Authorization: Bearer {{token}}
```

**预期响应:**
```json
{
  "success": true,
  "message": "文档列表获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "title": "我的第一个文档",
        "content": "这是文档的内容",
        "creator": {
          "id": 1,
          "username": "testuser",
          "email": "test@example.com"
        },
        "visibility": "private"
      }
    ],
    "count": 1
  },
  "statusCode": 200
}
```

#### 5. 获取单个文档详情
```
GET {{baseUrl}}/documents/1
Authorization: Bearer {{token}}
```

#### 6. 更新文档
```
PUT {{baseUrl}}/documents/1
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "更新后的文档标题",
  "content": "更新后的文档内容",
  "visibility": "public"
}
```

#### 7. 删除文档
```
DELETE {{baseUrl}}/documents/1
Authorization: Bearer {{token}}
```

### 第三阶段：权限测试

#### 8. 创建公开文档
```
POST {{baseUrl}}/documents
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "公开文档",
  "content": "这是一个公开文档",
  "type": "text",
  "visibility": "public"
}
```

#### 9. 匿名访问公开文档
```
GET {{baseUrl}}/documents?visibility=public
```
（不需要 Authorization header）

#### 10. 查询个人文档
```
GET {{baseUrl}}/documents?onlyMine=true
Authorization: Bearer {{token}}
```

## 🔍 测试验证点

### 成功场景验证
- ✅ 用户可以成功注册和登录
- ✅ 登录后可以创建、查看、更新、删除自己的文档
- ✅ 可以设置文档的可见性（私有/公开）
- ✅ 匿名用户可以访问公开文档
- ✅ 用户只能操作自己创建的文档

### 错误场景验证
- ❌ 未登录用户尝试创建文档 → 应返回 401
- ❌ 用户尝试编辑他人文档 → 应返回 403
- ❌ 用户尝试访问他人私有文档 → 应返回 403
- ❌ 使用错误的登录凭据 → 应返回 401
- ❌ 创建重复标题的文档 → 应返回 409

## 🛠️ 故障排除

### 1. 服务器未启动
**症状**: 连接被拒绝
**解决**: 确认运行 `npm run start:dev` 并看到服务器启动信息

### 2. 401 未授权错误
**症状**: 返回 "Unauthorized"
**解决**: 
- 检查是否正确设置了 `Authorization: Bearer {{token}}`
- 确认 token 是最新的（重新登录获取）

### 3. 数据库连接错误
**症状**: 服务器启动失败，数据库相关错误
**解决**: 
- 检查 `.env` 文件中的数据库配置
- 确认 MySQL 服务正在运行
- 确认数据库已创建

### 4. TypeORM 同步错误
**症状**: 实体同步失败
**解决**: 确认数据库表结构是否正确创建

## 📊 高级测试场景

### 1. 搜索功能测试
```
GET {{baseUrl}}/documents?keyword=文档&page=1&limit=5
Authorization: Bearer {{token}}
```

### 2. 文档类型过滤
```
GET {{baseUrl}}/documents?type=text
Authorization: Bearer {{token}}
```

### 3. 权限过滤
```
GET {{baseUrl}}/documents?visibility=private
Authorization: Bearer {{token}}
```

### 4. Token 刷新测试
```
POST {{baseUrl}}/users/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

## 📝 测试记录模板

建议在 Apifox 中为每个接口添加以下测试用例：

### 正常流程测试
- 正确的请求参数
- 预期的响应格式
- 状态码验证

### 异常流程测试  
- 缺少必需参数
- 无效的参数值
- 权限不足的访问
- 资源不存在的情况

### 边界条件测试
- 最大/最小长度的字符串
- 特殊字符处理
- 空值处理

---

## 🎯 开始测试

1. **启动项目**: `npm run start:dev`
2. **配置 Apifox**: 设置 Base URL 和环境变量
3. **按顺序测试**: 注册 → 登录 → 文档操作
4. **验证权限**: 测试不同用户间的权限隔离
5. **记录结果**: 验证每个接口的响应是否符合预期

现在您可以开始测试了！有任何问题随时询问。