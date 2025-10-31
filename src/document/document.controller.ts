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
import {
  CreateDocumentDto,
  CreateFolderDto,
  UpdateFileSystemItemDto,
  QueryDocumentDto,
} from './dto';
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
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        return new ResponseDto(
          false,
          '用户身份验证失败',
          undefined,
          '无法获取当前用户信息',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const document = await this.documentService.create(
        createDocumentDto,
        Number(currentUserId), // 确保是数字类型
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

  @Post('folders')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '创建文件夹',
    description:
      '创建新的文件夹。需要JWT认证，会自动使用当前登录用户作为文件夹创建者。',
  })
  @ApiBody({
    type: CreateFolderDto,
    description: '文件夹创建信息',
  })
  @ApiResponse({
    status: 201,
    description: '文件夹创建成功',
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 409, description: '文件夹名称已存在' })
  async createFolder(
    @Body() createFolderDto: CreateFolderDto,
    @Request() req: any,
  ) {
    try {
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        return new ResponseDto(
          false,
          '用户身份验证失败',
          undefined,
          '无法获取当前用户信息',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const folder = await this.documentService.createFolder(
        createFolderDto,
        Number(currentUserId), // 确保是数字类型
      );
      return new ResponseDto(
        true,
        '文件夹创建成功',
        folder,
        undefined,
        HttpStatus.CREATED,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '文件夹创建失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('folders/:folderId/path')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取文件夹路径',
    description:
      '获取指定文件夹的完整路径（面包屑导航），包含从根目录到当前文件夹的所有父级文件夹信息。',
  })
  @ApiParam({
    name: 'folderId',
    description: '文件夹ID，0表示根目录',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '获取文件夹路径成功',
    schema: {
      example: {
        success: true,
        message: '获取文件夹路径成功',
        data: {
          currentFolder: { id: 3, name: '子文件夹', parentId: 1 },
          breadcrumbs: [
            { id: null, name: '根目录', parentId: null },
            { id: 1, name: '父文件夹', parentId: null },
            { id: 3, name: '子文件夹', parentId: 1 },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 404, description: '文件夹不存在' })
  async getFolderPath(
    @Param('folderId', ParseIntPipe) folderId: number,
    @Request() req: any,
  ) {
    try {
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        return new ResponseDto(
          false,
          '用户身份验证失败',
          undefined,
          '无法获取当前用户信息',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 处理根目录的情况
      if (folderId === 0) {
        return new ResponseDto(
          true,
          '获取文件夹路径成功',
          {
            currentFolder: { id: null, name: '根目录', parentId: null },
            breadcrumbs: [{ id: null, name: '根目录', parentId: null }],
          },
          undefined,
          HttpStatus.OK,
        );
      }

      const pathData = await this.documentService.getFolderPath(
        folderId,
        Number(currentUserId),
      );

      return new ResponseDto(
        true,
        '获取文件夹路径成功',
        pathData,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '获取文件夹路径失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('documents/:documentId/path')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取文档路径',
    description: '获取指定文档的完整路径信息，包含面包屑导航。',
  })
  @ApiParam({
    name: 'documentId',
    description: '文档ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '获取文档路径成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '获取文档路径成功' },
        data: {
          type: 'object',
          properties: {
            currentDocument: { type: 'object', description: '当前文档信息' },
            breadcrumbs: {
              type: 'array',
              items: { type: 'object' },
              description: '面包屑路径（只包含文件夹）',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '无权访问此文档' })
  @ApiResponse({ status: 404, description: '文档不存在' })
  async getDocumentPath(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Request() req: any,
  ) {
    try {
      const currentUserId = req.user?.id || req.user?.sub;

      const pathData = await this.documentService.getDocumentPath(
        documentId,
        currentUserId ? Number(currentUserId) : undefined,
      );

      return new ResponseDto(
        true,
        '获取文档路径成功',
        pathData,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '获取文档路径失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('folders/:parentId/contents')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取文件夹内容',
    description:
      '获取指定文件夹下的所有文件和子文件夹。传入parentId为null或0表示获取根目录内容。',
  })
  @ApiParam({
    name: 'parentId',
    description: '父文件夹ID，null或0表示根目录',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '获取文件夹内容成功',
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async getFolderContents(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Request() req: any,
  ) {
    try {
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        return new ResponseDto(
          false,
          '用户身份验证失败',
          undefined,
          '无法获取当前用户信息',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 处理根目录的情况
      const actualParentId = parentId === 0 ? null : parentId;

      const result = await this.documentService.getFolderContentsWithMeta(
        actualParentId,
        Number(currentUserId),
      );

      return new ResponseDto(
        true,
        '获取文件夹内容成功',
        result,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '获取文件夹内容失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('tree')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取文件夹树结构（统一数据接口）',
    description:
      '获取当前用户的完整文件夹树结构，包含所有文件夹和文档的层次关系。支持搜索和过滤，作为统一的数据获取接口。',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: '搜索关键词（文档标题或文件夹名称）',
    example: '我的文档',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: '文档类型过滤',
    example: 'text',
  })
  @ApiQuery({
    name: 'visibility',
    required: false,
    description: '可见性过滤',
    example: 'public',
  })
  @ApiResponse({
    status: 200,
    description: '获取文件夹树成功',
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async getFolderTree(@Query() query: QueryDocumentDto, @Request() req: any) {
    try {
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        return new ResponseDto(
          false,
          '用户身份验证失败',
          undefined,
          '无法获取当前用户信息',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const tree = await this.documentService.getFolderTreeWithFilter(
        Number(currentUserId),
        query,
      );

      return new ResponseDto(
        true,
        '获取文件夹树成功',
        tree,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '获取文件夹树失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('batch')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '批量获取文档详情',
    description:
      '根据文档ID列表批量获取文档的详细信息，减少网络请求次数，适用于Keep-alive标签页快速加载。',
  })
  @ApiBody({
    description: '文档ID列表',
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2, 3],
          description: '要获取的文档ID数组',
        },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '批量获取文档成功',
    schema: {
      example: {
        success: true,
        message: '批量获取文档成功',
        data: {
          documents: [
            { id: 1, name: '文档1', content: '...' },
            { id: 2, name: '文档2', content: '...' },
          ],
          notFound: [3],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async batchGetDocuments(
    @Body() body: { ids: number[] },
    @Request() req: any,
  ) {
    try {
      const currentUserId = req.user?.id || req.user?.sub;
      if (!currentUserId) {
        return new ResponseDto(
          false,
          '用户身份验证失败',
          undefined,
          '无法获取当前用户信息',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        return new ResponseDto(
          false,
          '参数错误',
          undefined,
          'ids字段必须是非空数组',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.documentService.batchGetDocuments(
        body.ids,
        Number(currentUserId),
      );

      return new ResponseDto(
        true,
        '批量获取文档成功',
        result,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '批量获取文档失败',
        undefined,
        String(error?.message || '未知错误'),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取文档详情',
    description: '根据文档ID获取文档的详细信息。需要JWT认证。',
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
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '无权访问此文档' })
  @ApiResponse({ status: 404, description: '文档不存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    try {
      const currentUserId = req.user?.id || req.user?.sub;

      // 调试日志
      console.log('[DocumentController.findOne] 请求信息:', {
        documentId: id,
        reqUser: req.user,
        extractedUserId: currentUserId,
        userIdType: typeof currentUserId,
      });

      if (!currentUserId) {
        return new ResponseDto(
          false,
          '用户身份验证失败',
          undefined,
          '无法获取当前用户信息',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const document = await this.documentService.findDocsOne(
        id,
        Number(currentUserId),
      );
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
      const statusCode =
        error?.status === HttpStatus.FORBIDDEN
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;
      return new ResponseDto(
        false,
        '文档详情获取失败',
        undefined,
        String(error?.message || '未知错误'),
        statusCode,
      );
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '智能更新文件系统项目（文件夹或文档）',
    description:
      '智能更新指定ID的文件夹或文档。系统会自动识别项目类型并应用相应的更新逻辑。需要JWT认证，只有创建者才能更新。',
  })
  @ApiParam({
    name: 'id',
    description: '文件系统项目ID（文件夹或文档）',
    example: 1,
    type: 'number',
  })
  @ApiBody({
    type: UpdateFileSystemItemDto,
    description: '更新信息 - 系统会根据现有项目类型智能处理字段',
    examples: {
      更新文件夹: {
        value: {
          name: '新文件夹名称',
          parentId: 2,
        },
      },
      更新文档: {
        value: {
          title: '新文档标题',
          content: '更新的文档内容...',
          type: 'TEXT',
          parentId: 1,
        },
      },
      移动到根目录: {
        value: {
          parentId: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '项目不存在' })
  @ApiResponse({ status: 409, description: '名称冲突' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFileSystemItemDto,
    @Request() req: any,
  ) {
    try {
      const currentUserId = Number(req.user.sub); // 确保是数字类型

      const updatedItem = await this.documentService.updateFileSystemItem(
        id,
        updateDto,
        currentUserId,
      );

      return new ResponseDto(
        true,
        '更新成功',
        updatedItem,
        undefined,
        HttpStatus.OK,
      );
    } catch (error: any) {
      return new ResponseDto(
        false,
        '更新失败',
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
