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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '创建文档',
    description:
      '创建新的文档。需要JWT认证，会自动使用当前登录用户作为文档创建者。',
  })
  @ApiBody({
    type: CreateDocumentDto,
    description: '文档创建信息',
  })
  @ApiResponse({
    status: 201,
    description: '文档创建成功',
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
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

  @Get('public')
  @ApiOperation({
    summary: '获取公开文档列表（无需认证）',
    description: '获取所有公开文档列表，无需JWT认证。主要用于调试和公开访问。',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码，默认为1',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量，默认为10',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '获取公开文档列表成功',
  })
  async findPublic(@Query() query: QueryDocumentDto) {
    try {
      // 不传用户ID，只返回公开文档
      const result = await this.documentService.findDocsList(query);
      return new ResponseDto(
        true,
        '公开文档列表获取成功',
        result,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '公开文档列表获取失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取文档列表',
    description:
      '获取文档列表，支持分页、搜索和筛选。需要JWT认证，显示当前用户的私有文档和所有公开文档。',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码，默认为1',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量，默认为10',
    example: 10,
  })
  @ApiQuery({
    name: 'title',
    required: false,
    description: '文档标题搜索关键词',
    example: '我的文档',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: '文档类型过滤',
    example: 'text',
  })
  @ApiResponse({
    status: 200,
    description: '获取文档列表成功',
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async findAll(@Query() query: QueryDocumentDto, @Request() req: any) {
    try {
      // 获取当前用户ID（JWT Guard确保用户已认证）
      const currentUserId = Number(req.user.sub);

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
  @ApiOperation({
    summary: '获取文档详情',
    description: '根据文档ID获取文档的详细信息。',
  })
  @ApiParam({
    name: 'id',
    description: '文档ID',
    example: 1,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: '获取文档详情成功',
  })
  @ApiResponse({ status: 404, description: '文档不存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新文档',
    description: '更新指定ID的文档信息。需要JWT认证，只有文档创建者才能更新。',
  })
  @ApiParam({
    name: 'id',
    description: '文档ID',
    example: 1,
    type: 'number',
  })
  @ApiBody({
    type: UpdateDocumentDto,
    description: '文档更新信息',
  })
  @ApiResponse({
    status: 200,
    description: '文档更新成功',
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '文档不存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除文档',
    description: '删除指定ID的文档。需要JWT认证，只有文档创建者才能删除。',
  })
  @ApiParam({
    name: 'id',
    description: '文档ID',
    example: 1,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: '文档删除成功',
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '文档不存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
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
