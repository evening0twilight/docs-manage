import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as COS from 'cos-nodejs-sdk-v5';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class UploadService {
  private cosClient: COS;
  private bucket: string;
  private region: string;
  private domain: string;
  private maxFileSize: number;
  private allowedTypes: string[];
  private cosConfigured: boolean;

  constructor(private configService: ConfigService) {
    const secretId = this.configService.get<string>('cos.secretId');
    const secretKey = this.configService.get<string>('cos.secretKey');

    // 初始化腾讯云 COS 客户端
    this.cosClient = new COS({
      SecretId: secretId,
      SecretKey: secretKey,
    });

    this.bucket = this.configService.get<string>('cos.bucket') || '';
    this.region = this.configService.get<string>('cos.region') || '';
    this.domain = this.configService.get<string>('cos.domain') || '';
    this.maxFileSize =
      this.configService.get<number>('cos.maxFileSize') || 10485760;
    this.allowedTypes = this.configService.get<string[]>(
      'cos.allowedTypes',
    ) || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    // 配置完整才视为可用;否则不阻断启动,但在实际使用时给出明确错误(替代静默失败)
    this.cosConfigured = Boolean(
      secretId && secretKey && this.bucket && this.region && this.domain,
    );
    if (this.cosConfigured) {
      console.log('[UploadService] 腾讯云 COS 初始化成功');
    } else {
      console.warn(
        '[UploadService] ⚠️ COS 配置不完整,文件上传/删除功能不可用' +
          '(需配置 COS_SECRET_ID/COS_SECRET_KEY/COS_BUCKET/COS_REGION/COS_DOMAIN)',
      );
    }
  }

  /** 确保 COS 已正确配置,否则抛出明确错误(替代静默失败) */
  private ensureConfigured(): void {
    if (!this.cosConfigured) {
      throw new HttpException(
        '文件存储(COS)未配置,无法处理文件操作',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 上传单个文件
   * @param file Express.Multer.File
   * @param folder 存储文件夹 (如: 'avatars', 'documents')
   * @returns 文件URL
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<string> {
    this.ensureConfigured();
    // 验证文件
    this.validateFile(file);

    // 生成唯一文件名
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const key = `${folder}/${filename}`;

    try {
      // 上传到 COS
      await this.cosClient.putObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      console.log(`[UploadService] 文件上传成功: ${key}`);

      // 返回文件URL
      return `${this.domain}/${key}`;
    } catch (error) {
      console.error('[UploadService] 文件上传失败:', error);
      throw new HttpException('文件上传失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 上传多个文件
   * @param files Express.Multer.File[]
   * @param folder 存储文件夹
   * @returns 文件URL数组
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new HttpException('没有文件', HttpStatus.BAD_REQUEST);
    }

    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * 删除文件
   * @param fileUrl 文件URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    this.ensureConfigured();
    try {
      // 从URL提取Key
      const key = fileUrl.replace(`${this.domain}/`, '');

      await this.cosClient.deleteObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
      });

      console.log(`[UploadService] 文件删除成功: ${key}`);
    } catch (error) {
      console.error('[UploadService] 文件删除失败:', error);
      throw new HttpException('文件删除失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 生成临时访问URL(用于私有文件)
   * @param fileUrl 文件URL
   * @param expiresIn 过期时间(秒)
   * @returns 临时URL
   */
  getSignedUrl(fileUrl: string, expiresIn: number = 3600): string {
    this.ensureConfigured();
    try {
      const key = fileUrl.replace(`${this.domain}/`, '');

      const url = this.cosClient.getObjectUrl({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Sign: true,
        Expires: expiresIn,
      });

      return url;
    } catch (error) {
      console.error('[UploadService] 生成签名URL失败:', error);
      throw new HttpException(
        '生成访问链接失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 验证文件
   * @param file Express.Multer.File
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new HttpException('文件不能为空', HttpStatus.BAD_REQUEST);
    }

    // 验证文件大小
    if (file.size > this.maxFileSize) {
      const maxSizeMB = this.maxFileSize / 1024 / 1024;
      throw new HttpException(
        `文件大小不能超过 ${maxSizeMB}MB`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 验证文件类型
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new HttpException(
        `不支持的文件类型: ${file.mimetype}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
