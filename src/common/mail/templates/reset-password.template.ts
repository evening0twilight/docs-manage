/**
 * 邮件模板 - 重置密码邮件
 */
export interface ResetPasswordTemplateData {
  username: string;
  resetLink: string;
  expiresIn: number; // 分钟
  ipAddress?: string;
}

export function getResetPasswordTemplate(data: ResetPasswordTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = '【Docs Manage】重置密码请求';

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Microsoft YaHei', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: normal;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .reset-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: bold;
      transition: all 0.3s ease;
    }
    .reset-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .link-info {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
      word-break: break-all;
    }
    .link-info p {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
    }
    .link-url {
      color: #667eea;
      word-break: break-all;
    }
    .tips {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .tips-title {
      font-weight: bold;
      color: #856404;
      margin-bottom: 8px;
    }
    .tips-content {
      color: #856404;
      font-size: 14px;
      line-height: 1.6;
    }
    .security-info {
      background-color: #e7f3ff;
      border-left: 4px solid #0d6efd;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #084298;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
      border-top: 1px solid #e9ecef;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Docs Manage</h1>
    </div>
    <div class="content">
      <div class="greeting">
        您好，<strong>${data.username}</strong>！
      </div>
      <p>我们收到了您的密码重置请求。点击下面的按钮可以重置您的密码：</p>
      
      <div class="button-container">
        <a href="${data.resetLink}" class="reset-button">重置密码</a>
      </div>
      
      <div class="link-info">
        <p>如果按钮无法点击，请复制以下链接到浏览器打开：</p>
        <p class="link-url">${data.resetLink}</p>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px;">
        此链接将在 <strong>${data.expiresIn} 分钟</strong>后失效
      </p>
      
      ${
        data.ipAddress
          ? `
      <div class="security-info">
        <strong>🔒 安全信息</strong><br>
        请求IP地址：${data.ipAddress}<br>
        请求时间：${new Date().toLocaleString('zh-CN')}
      </div>
      `
          : ''
      }
      
      <div class="tips">
        <div class="tips-title">⚠️ 安全提示</div>
        <div class="tips-content">
          • 如果这不是您本人的操作，请忽略此邮件，您的密码不会被更改<br>
          • 请勿将此链接分享给任何人<br>
          • 建议使用强密码，包含大小写字母、数字和特殊字符<br>
          • 定期更换密码以保护账户安全
        </div>
      </div>
      
      <p style="color: #999; font-size: 14px; margin-top: 30px;">
        此邮件由系统自动发送，请勿直接回复。如有疑问，请联系客服。
      </p>
    </div>
    <div class="footer">
      <p>© 2025 Docs Manage. All rights reserved.</p>
      <p>保护您的账户安全是我们的首要任务</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
【Docs Manage】重置密码请求

您好，${data.username}！

我们收到了您的密码重置请求。请访问以下链接重置您的密码：

${data.resetLink}

此链接将在 ${data.expiresIn} 分钟后失效。

${
  data.ipAddress
    ? `
安全信息：
请求IP地址：${data.ipAddress}
请求时间：${new Date().toLocaleString('zh-CN')}
`
    : ''
}

安全提示：
• 如果这不是您本人的操作，请忽略此邮件，您的密码不会被更改
• 请勿将此链接分享给任何人
• 建议使用强密码，包含大小写字母、数字和特殊字符
• 定期更换密码以保护账户安全

此邮件由系统自动发送，请勿直接回复。

© 2025 Docs Manage. All rights reserved.
  `;

  return { subject, html, text };
}
