# API 变更说明

## 📅 更新日期：2025-10-10

## ⚠️ 已废弃的 API

### 1. 直接注册接口（已删除）

**接口**: `POST /api/users/register`

**状态**: ❌ 已删除

**原因**: 为了提高安全性，现在所有新用户注册都必须通过邮箱验证。

**替代方案**: 请使用以下两步注册流程：

#### 第一步：发送验证码
```http
POST /api/users/send-verification-code
Content-Type: application/json

{
  "email": "user@example.com",
  "type": "register"
}
```

#### 第二步：使用验证码注册
```http
POST /api/users/register-with-code
Content-Type: application/json

{
  "username": "testuser",
  "email": "user@example.com",
  "password": "YourPassword123",
  "code": "123456"
}
```

---

## ✅ 当前可用的用户认证 API

### 1. 发送验证码
- **接口**: `POST /api/users/send-verification-code`
- **用途**: 发送邮箱验证码（注册或重置密码）
- **限流**: 
  - 单个邮箱：5次/小时
  - 单个IP：10次/天
  - 同一操作：60秒冷却

### 2. 邮箱验证注册
- **接口**: `POST /api/users/register-with-code`
- **用途**: 通过邮箱验证码完成用户注册
- **验证码有效期**: 10分钟

### 3. 用户登录
- **接口**: `POST /api/users/login`
- **用途**: 使用用户名/邮箱和密码登录
- **状态**: ✅ 正常使用

### 4. 重置密码
- **接口**: `POST /api/users/reset-password`
- **用途**: 通过邮箱验证码重置密码
- **验证码有效期**: 10分钟

---

## 📊 已存在账号的兼容性

**重要说明**: 
- ✅ 所有在删除旧注册接口**之前**创建的账号完全不受影响
- ✅ 这些账号可以正常使用 `POST /api/users/login` 登录
- ✅ 可以正常使用所有其他用户功能（修改资料、修改密码等）

---

## 🔒 安全性提升

通过移除直接注册接口，我们实现了：

1. **邮箱验证必需**: 确保所有新用户提供的邮箱地址真实有效
2. **防止垃圾注册**: 限流机制防止批量注册攻击
3. **智能路由**: 使用多邮件服务商提高邮件送达率
4. **配额管理**: 每日邮件发送配额限制，防止滥用

---

## 📝 开发者注意事项

### 前端需要更新的内容

1. **注册页面**:
   - 添加"发送验证码"按钮
   - 添加验证码输入框
   - 更新注册 API 调用为 `register-with-code`

2. **错误处理**:
   - 处理验证码错误（400: 验证码无效或已过期）
   - 处理限流错误（429: 发送频率过高）
   - 处理配额错误（503: 邮件发送配额已用尽）

### 测试建议

```bash
# 1. 测试发送验证码
curl -X POST http://localhost:3000/api/users/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"register"}'

# 2. 测试邮箱注册（使用收到的验证码）
curl -X POST http://localhost:3000/api/users/register-with-code \
  -H "Content-Type: application/json" \
  -d '{
    "username":"newuser",
    "email":"test@example.com",
    "password":"Password123",
    "code":"123456"
  }'

# 3. 测试登录（使用新注册的账号）
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"Password123"}'
```

---

## 🔄 数据迁移

**无需数据迁移**: 此次更改只涉及 API 接口，不影响数据库结构或现有数据。

---

## 📮 相关文档

- [邮箱验证 API 文档](./EMAIL_VERIFICATION_API.md)
- [邮箱验证实现文档](./EMAIL_VERIFICATION_IMPLEMENTATION.md)
- [快速启动指南](./QUICK_START_EMAIL_VERIFICATION.md)
