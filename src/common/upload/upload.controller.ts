import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../users/guards/jwt-auth.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * 上传单个图片
   * POST /api/upload/image
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const url = await this.uploadService.uploadFile(file, 'images');

    return {
      success: true,
      data: {
        url,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
      message: '图片上传成功',
    };
  }

  /**
   * 上传多个图片
   * POST /api/upload/images
   */
  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const urls = await this.uploadService.uploadFiles(files, 'images');

    return {
      success: true,
      data: {
        urls,
        count: files.length,
      },
      message: `成功上传 ${files.length} 个图片`,
    };
  }

  /**
   * 上传头像
   * POST /api/upload/avatar
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的头像');
    }

    const url = await this.uploadService.uploadFile(file, 'avatars');

    return {
      success: true,
      data: {
        url,
      },
      message: '头像上传成功',
    };
  }
}
