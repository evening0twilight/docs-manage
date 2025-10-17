# 用户信息字段说明

## 📋 完整的用户字段列表

### 基础信息
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | number | ✅ | 用户唯一标识 |
| `username` | string | ✅ | 用户名(唯一,2-20字符) |
| `email` | string | ✅ | 邮箱(唯一) |
| `password` | string | ✅ | 密码(加密存储,不返回给前端) |

### 个人资料
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `avatar` | string | ❌ | 头像URL(通过腾讯云COS存储) |
| `displayName` | string | ❌ | 昵称/显示名称(最多100字符) |
| `phone` | string | ❌ | 手机号(最多20字符) |
| `bio` | string | ❌ | 个人简介(最多500字符) |
| `location` | string | ❌ | 所在地(最多100字符) |
| `website` | string | ❌ | 个人网站(URL格式,最多200字符) |
| `organization` | string | ❌ | 公司/组织(最多100字符) |
| `position` | string | ❌ | 职位(最多100字符) |

### 系统字段
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `isActive` | boolean | ✅ | 账号是否激活(默认true) |
| `lastLoginAt` | Date | ❌ | 最后登录时间(自动更新) |
| `createdAt` | Date | ✅ | 创建时间(自动生成) |
| `updatedAt` | Date | ✅ | 更新时间(自动更新) |

---

## 🔌 API 接口

### 1. 获取用户信息
```http
GET /api/users/profile
Authorization: Bearer <token>
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "avatar": "https://docs-manage-files-1352341719.cos.ap-guangzhou.myqcloud.com/avatars/abc-123.jpg",
    "displayName": "张三",
    "phone": "13800138000",
    "bio": "这是我的个人简介",
    "location": "北京",
    "website": "https://example.com",
    "organization": "某某公司",
    "position": "前端工程师",
    "lastLoginAt": "2025-10-13T10:30:00.000Z",
    "createdAt": "2025-10-01T08:00:00.000Z",
    "updatedAt": "2025-10-13T10:30:00.000Z"
  },
  "message": "获取用户信息成功"
}
```

---

### 2. 更新用户信息
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体:**
```json
{
  "displayName": "李四",
  "phone": "13900139000",
  "bio": "全栈开发工程师",
  "location": "上海",
  "website": "https://lisi.dev",
  "organization": "XX科技有限公司",
  "position": "技术总监"
}
```

**响应:** 同上(返回更新后的完整用户信息)

---

### 3. 上传头像
```http
POST /api/users/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求体 (form-data):**
- Key: `file`
- Type: File
- Value: 图片文件

**响应:**
```json
{
  "success": true,
  "data": {
    "avatar": "https://docs-manage-files-1352341719.cos.ap-guangzhou.myqcloud.com/avatars/uuid-xxx.jpg"
  },
  "message": "头像上传成功"
}
```

**说明:**
- 支持格式: `jpeg`, `png`, `gif`, `webp`
- 最大文件大小: 10MB
- 上传成功后会自动更新用户的 `avatar` 字段

---

## 🎨 前端使用建议

### 用户资料页面布局建议

```
┌─────────────────────────────────────┐
│           个人资料设置               │
├─────────────────────────────────────┤
│                                     │
│  [头像]  displayName                │
│          @username                  │
│          email                      │
│                                     │
├─────────────────────────────────────┤
│  基本信息:                          │
│  - 昵称: [输入框]                   │
│  - 手机: [输入框]                   │
│  - 所在地: [输入框]                 │
│                                     │
│  职业信息:                          │
│  - 公司: [输入框]                   │
│  - 职位: [输入框]                   │
│                                     │
│  社交信息:                          │
│  - 网站: [输入框]                   │
│                                     │
│  个人简介:                          │
│  [文本域 - 最多500字]               │
│                                     │
│  账号信息:                          │
│  - 注册时间: createdAt              │
│  - 最后登录: lastLoginAt            │
│                                     │
│         [保存更改] [取消]            │
└─────────────────────────────────────┘
```

### 头像显示逻辑

```typescript
// 用户头像显示
function getUserAvatar(user) {
  return user.avatar || '/default-avatar.png';
}

// 用户显示名称
function getUserDisplayName(user) {
  return user.displayName || user.username;
}
```

### 表单验证

```typescript
const userProfileSchema = {
  displayName: {
    maxLength: 100,
    message: '昵称最多100个字符'
  },
  phone: {
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入有效的手机号'
  },
  bio: {
    maxLength: 500,
    message: '个人简介最多500个字符'
  },
  website: {
    pattern: /^https?:\/\/.+/,
    message: '请输入有效的网站地址'
  }
};
```

---

## 📝 数据库迁移说明

启动应用后,TypeORM 会自动创建/更新数据库字段:
- ✅ 自动添加新字段
- ✅ 现有数据不受影响
- ✅ 所有新字段都是可选的 (`nullable: true`)

如果出现字段冲突,需要手动删除旧字段或重置数据库。

---

## 🔒 安全注意事项

1. **密码字段**: 永远不会返回给前端
2. **refreshToken**: 仅用于刷新令牌,不返回给前端
3. **头像URL**: 存储在腾讯云COS,公开可访问
4. **个人信息**: 仅限本人查看和修改

---

## 📱 移动端适配

所有字段都支持移动端显示和编辑,建议:
- 头像支持点击放大查看
- 长文本(bio)支持折叠显示
- 表单采用分步填写方式
- 图片上传支持相册和拍照选择
