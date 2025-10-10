/**
 * 邮件模板 - 验证码邮件
 */
export interface VerificationCodeTemplateData {
  code: string;
  expiresIn: number; // 分钟
  purpose: 'register' | 'reset_password' | 'change_email';
}

export function getVerificationCodeTemplate(
  data: VerificationCodeTemplateData,
): { subject: string; html: string; text: string } {
  const purposeText = {
    register: '注册账户',
    reset_password: '重置密码',
    change_email: '更换邮箱',
  };

  const subject = `【Docs Manage】${purposeText[data.purpose]}验证码`;

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
    .code-container {
      background-color: #f8f9fa;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
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
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
      border-top: 1px solid #e9ecef;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 Docs Manage</h1>
    </div>
    <div class="content">
      <div class="greeting">
        您好！
      </div>
      <p>您正在进行<strong>${purposeText[data.purpose]}</strong>操作，您的验证码是：</p>
      
      <div class="code-container">
        <div class="code">${data.code}</div>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px;">
        验证码有效期为 <strong>${data.expiresIn} 分钟</strong>，请尽快使用
      </p>
      
      <div class="tips">
        <div class="tips-title">⚠️ 安全提示</div>
        <div class="tips-content">
          • 请勿将验证码透露给他人<br>
          • 如非本人操作，请忽略此邮件<br>
          • 验证码仅可使用一次，使用后立即失效
        </div>
      </div>
      
      <p style="color: #999; font-size: 14px; margin-top: 30px;">
        此邮件由系统自动发送，请勿直接回复。
      </p>
    </div>
    <div class="footer">
      <p>© 2025 Docs Manage. All rights reserved.</p>
      <p>这是一封自动发送的邮件，如有疑问请联系客服</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
【Docs Manage】${purposeText[data.purpose]}验证码

您好！

您正在进行${purposeText[data.purpose]}操作，您的验证码是：

${data.code}

验证码有效期为 ${data.expiresIn} 分钟，请尽快使用。

安全提示：
• 请勿将验证码透露给他人
• 如非本人操作，请忽略此邮件
• 验证码仅可使用一次，使用后立即失效

此邮件由系统自动发送，请勿直接回复。

© 2025 Docs Manage. All rights reserved.
  `;

  return { subject, html, text };
}
