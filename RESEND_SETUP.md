# Resend 邮件服务集成说明

## ✅ 已完成的配置

### 1. 安装依赖
- ✅ 已安装 `resend` SDK

### 2. 环境配置

**本地开发 (`.env`)**
```bash
MAIL_PROVIDER=smtp  # 本地使用 SMTP (QQ/163)
RESEND_API_KEY=re_S3Jfh3dh_DpPF9TtJRe99iSFzj1ASeUy3
RESEND_FROM=onboarding@resend.dev
```

**生产环境 (`.env.production`)**
```bash
MAIL_PROVIDER=resend  # 服务器使用 Resend API
RESEND_API_KEY=re_S3Jfh3dh_DpPF9TtJRe99iSFzj1ASeUy3
RESEND_FROM=onboarding@resend.dev
```

### 3. 代码修改
- ✅ 更新 `mail.service.ts` 支持 Resend
- ✅ 自动根据 `MAIL_PROVIDER` 选择发送方式
- ✅ 保留 SMTP 支持(本地开发用)

---

## 📧 工作原理

### 发件人和收件人

**发件人(From):**
- 免费版固定使用: `onboarding@resend.dev`
- 这是 Resend 提供的测试发件地址
- 如需自定义域名,需升级付费版

**收件人(To):**
- 可以是任何邮箱: QQ、163、Gmail 等
- 用户注册时填什么邮箱,就发到那个邮箱

**示例:**
```
用户注册邮箱: zhang san@qq.com
↓
后端调用 Resend API
↓
发送邮件:
  From: onboarding@resend.dev
  To: zhangsan@qq.com
  Subject: 【文档管理系统】验证码
  Content: 您的验证码是: 123456
↓
用户在 QQ 邮箱收到来自 onboarding@resend.dev 的邮件 ✅
```

---

## 🚀 部署步骤

### 1. 提交代码
```bash
git add .
git commit -m "feat: 集成 Resend 邮件服务"
git push
```

### 2. 在服务器上更新
```bash
ssh root@165.227.56.186

cd /home/deploy/docs-manage

# 拉取最新代码
git pull

# 上传生产环境配置
# (在本地执行)
scp e:\桌面\毕设\docs-manage\.env.production root@165.227.56.186:/home/deploy/docs-manage/.env

# 重新构建并启动
docker-compose down
docker-compose up -d --build

# 查看日志
docker-compose logs -f app
```

### 3. 测试邮件发送
访问你的注册页面,输入邮箱地址测试验证码发送。

---

## 📊 Resend 免费额度

- **每月:** 3,000 封邮件
- **每天:** 100 封邮件
- **发送速度:** 几秒内到达
- **统计面板:** https://resend.com/emails

---

## 🔄 切换模式

**本地开发用 SMTP:**
```bash
# .env
MAIL_PROVIDER=smtp
```

**生产环境用 Resend:**
```bash
# .env.production
MAIL_PROVIDER=resend
```

---

## 🎯 优势

| 对比项 | SMTP (QQ/163) | Resend API |
|--------|--------------|-----------|
| 端口要求 | 需要 25/465/587 | 仅需 HTTPS (443) |
| 云服务器兼容 | ❌ 经常被封 | ✅ 完美兼容 |
| 发送速度 | 3-10秒 | 1-3秒 |
| 稳定性 | 一般 | 优秀 |
| 统计面板 | 无 | ✅ 有详细统计 |
| 成本 | 免费 | 免费额度足够 |

---

## ⚠️ 注意事项

1. **API Key 保密:** 不要泄露你的 API Key
2. **免费额度:** 注意不要超过每月 3000 封
3. **发件人地址:** 免费版只能用 `onboarding@resend.dev`
4. **测试:** 先在本地测试成功再部署到服务器

---

## 🆘 常见问题

**Q: 用户会看到发件人是 onboarding@resend.dev 吗?**
A: 是的,但不影响使用。用户主要关注邮件内容,不太在意发件人。

**Q: 如何自定义发件人域名?**
A: 需要:
1. 拥有自己的域名
2. 在 Resend 添加并验证域名
3. 升级到付费计划($20/月起)
4. 修改 `RESEND_FROM=noreply@yourdomain.com`

**Q: 如果超过免费额度怎么办?**
A: Resend 会停止发送,你需要:
1. 等到下个月(额度重置)
2. 或者升级付费计划

**Q: 本地开发为什么还用 SMTP?**
A: 为了节省 Resend 免费额度,本地测试时用 QQ/163 邮箱。
