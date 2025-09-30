# 🛠️ API 测试修复指南

## 🔧 修复的问题

### 1. 文档类型枚举值问题
**❌ 错误的请求：**
```json
{
  "type": "TEXT"  // 大写，不正确
}
```

**✅ 正确的请求：**
```json
{
  "type": "text"  // 小写，正确
}
```

### 2. JWT用户身份获取问题
已修复Controller中用户ID获取的不一致问题，现在支持两种JWT payload格式。

## 📝 正确的API测试请求

### 创建文档
```json
POST /api/documents
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "title": "我的第3个文档",
  "content": "这是文档的主要内容...",
  "description": "这是一个用于测试的文档",
  "type": "text",
  "parentId": 1,
  "visibility": "private"
}
```

### 创建文件夹
```json
POST /api/documents/folders
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "name": "我的项目文件夹",
  "description": "这是一个项目文件夹",
  "parentId": null,
  "visibility": "public"
}
```

## 📋 完整的文档类型枚举值

支持的文档类型（注意都是小写）：
- `"text"` - 文本文档
- `"image"` - 图片文档
- `"word"` - Word文档
- `"excel"` - Excel表格
- `"other"` - 其他类型

## 🔑 JWT Token 获取

如果你的JWT token有问题，重新登录获取：

```json
POST /api/users/login
Content-Type: application/json

{
  "username": "testuser1",
  "password": "your_password"
}
```

响应会包含新的JWT token：
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 2,
      "username": "testuser1"
    }
  }
}
```

## 🧪 测试步骤

1. **重新登录获取token**
2. **创建根文件夹**：
   ```json
   {
     "name": "测试项目",
     "description": "用于测试的根文件夹"
   }
   ```
3. **创建子文件夹**：
   ```json
   {
     "name": "文档目录", 
     "description": "存放文档的子文件夹",
     "parentId": 1
   }
   ```
4. **创建文档**：
   ```json
   {
     "title": "测试文档",
     "content": "测试内容...",
     "description": "这是一个测试文档",
     "type": "text",
     "parentId": 2
   }
   ```
5. **验证结构**：
   ```
   GET /api/documents/tree
   ```

现在重新测试应该就可以成功了！🎉