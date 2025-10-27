# 数据库种子脚本使用说明

## seed-documents.ts - 文档数据生成器

### 功能
自动生成测试用的文件夹和文档数据，包含：
- 文件夹（30%）和文档（70%）
- 随机分配父目录、创建者、可见性
- 自动生成缩略图 URL（使用占位图服务）
- 支持所有文档类型（text, image, word, excel, other）
- 5% 概率生成已删除数据（测试回收站）

---

## 🚀 快速开始

### 🔵 本地数据库（开发环境）
```bash
npx ts-node scripts/seed-documents.ts 10
```

### 🔴 线上数据库（生产环境）
```bash
npx ts-node scripts/seed-documents.ts 10 --prod
```

---

## 📖 详细使用方法

### 方式 1：使用参数切换环境（推荐）
```bash
# 本地数据库
npx ts-node scripts/seed-documents.ts 10

# 线上数据库（加 --prod 参数）
npx ts-node scripts/seed-documents.ts 10 --prod
```

### 方式 2：临时指定数据库（不改代码）
```bash
# Windows CMD
set DB_HOST=165.227.56.186 && npx ts-node scripts/seed-documents.ts 10

# Windows PowerShell  
$env:DB_HOST="165.227.56.186"; npx ts-node scripts/seed-documents.ts 10

# Linux/Mac
DB_HOST=165.227.56.186 npx ts-node scripts/seed-documents.ts 10
```

### 方式 3：SSH 到服务器运行
```bash
ssh root@165.227.56.186
cd /root/docs-manage
npx ts-node scripts/seed-documents.ts 10
```

---

## ⚙️ 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `数字` | 生成数据条数 | `10` 生成 10 条 |
| `--prod` | 连接生产数据库 | 使用 .env 中的线上配置 |

---

## 🔧 环境配置

确保 `.env` 文件包含数据库配置：
```env
# 根据 --prod 参数自动选择
DB_HOST=localhost          # 不加 --prod 用本地
# DB_HOST=165.227.56.186   # 加 --prod 用这个
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的密码
DB_DATABASE=docs-manage
```

---

## 📊 输出示例

```
� 环境: 生产环境(线上)
📍 数据库: 165.227.56.186

🔌 正在连接数据库...
✅ 数据库连接成功

� 准备数据...
   - 发现 3 个用户
   - 发现 2 个现有文件夹

✨ 开始生成数据...
✅ 成功插入 10 条数据，ID 范围: 16-25

� 统计信息:
   - 文件夹：4 个
   - 文档：6 个
   - 已删除：0 个
   - 根目录项：3 个

✅ 数据生成完成！
```
