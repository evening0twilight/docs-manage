const path = require('path');
const fs = require('fs');

// 测试环境文件路径
const envPath = path.join(__dirname, '../.env');
console.log('ENV 文件路径:', envPath);
console.log('ENV 文件是否存在:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('ENV 文件内容:');
  console.log(envContent);
}

// 加载环境变量
require('dotenv').config({ path: envPath });
console.log('\n环境变量:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***隐藏***' : '未设置');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***隐藏***' : '未设置');