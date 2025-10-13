import { registerAs } from '@nestjs/config';

export default registerAs('cos', () => ({
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION,
  domain: process.env.COS_DOMAIN,
  maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10), // 10MB
  allowedTypes: (
    process.env.UPLOAD_ALLOWED_TYPES ||
    'image/jpeg,image/png,image/gif,image/webp'
  ).split(','),
}));
