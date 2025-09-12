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
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto';
import { ResponseDto } from '../common/dto';
import { DocumentEntity } from './document.entity';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  async create(@Body() createDocumentDto: CreateDocumentDto) {
    try {
      // 将 DTO 转换为实体格式
      const documentData: Partial<DocumentEntity> = {
        title: createDocumentDto.title,
        content: createDocumentDto.content || '',
        author: 'default', // 临时默认值，后续可以从JWT获取
        type: this.getTypeNumber(createDocumentDto.type),
        thumb_url: createDocumentDto.filePath || '',
      };

      const document = await this.documentService.create(documentData);
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
  async findAll(@Query() query: any) {
    try {
      const result = await this.documentService.findDocsList(query);
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    try {
      // 将 DTO 转换为实体格式
      const updateData: Partial<DocumentEntity> = {
        title: updateDocumentDto.title,
        content: updateDocumentDto.content,
        type: updateDocumentDto.type
          ? this.getTypeNumber(updateDocumentDto.type)
          : undefined,
        thumb_url: updateDocumentDto.filePath,
        updated_time: new Date(),
      };

      // 过滤掉 undefined 值
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const document = await this.documentService.updateById(id, updateData);
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
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.documentService.remove(id);
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
