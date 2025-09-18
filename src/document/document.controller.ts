import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentDto } from './dto';
import { ResponseDto } from '../common/dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req: any,
  ) {
    try {
      const currentUserId = Number(req.user.sub); // 确保是数字类型

      const document = await this.documentService.create(
        createDocumentDto,
        currentUserId,
      );
      return new ResponseDto(
        true,
        '文档创建成功',
        document,
        undefined,
        HttpStatus.CREATED,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '文档创建失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAll(@Query() query: QueryDocumentDto, @Request() req?: any) {
    try {
      // 获取当前用户ID（如果已登录）
      const currentUserId = req?.user?.sub ? Number(req.user.sub) : undefined;

      const result = await this.documentService.findDocsList(
        query,
        currentUserId,
      );
      return new ResponseDto(
        true,
        '文档列表获取成功',
        result,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '文档列表获取失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const document = await this.documentService.findDocsOne(id);
      if (!document) {
        return new ResponseDto(
          false,
          '文档不存在',
          undefined,
          '未找到指定文档',
          HttpStatus.NOT_FOUND,
        );
      }
      return new ResponseDto(
        true,
        '文档详情获取成功',
        document,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '文档详情获取失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req: any,
  ) {
    try {
      const currentUserId = Number(req.user.sub); // 确保是数字类型

      const document = await this.documentService.updateById(
        id,
        updateDocumentDto,
        currentUserId,
      );
      return new ResponseDto(
        true,
        '文档更新成功',
        document,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '文档更新失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    try {
      const currentUserId = Number(req.user.sub); // 确保是数字类型

      await this.documentService.remove(id, currentUserId);
      return new ResponseDto(
        true,
        '文档删除成功',
        undefined,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '文档删除失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 辅助方法：将字符串类型转换为数字类型
  private getTypeNumber(type?: string): number {
    const typeMap: { [key: string]: number } = {
      text: 1,
      image: 2,
      pdf: 3,
      word: 4,
      excel: 5,
      other: 0,
    };
    return type ? typeMap[type] || 0 : 0;
  }
}
