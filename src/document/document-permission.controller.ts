import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DocumentPermissionService } from './document-permission.service';
import {
  ShareDocumentDto,
  UpdatePermissionDto,
} from './dto/share-document.dto';

@ApiTags('document-permissions')
@Controller('documents/:documentId/permissions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class DocumentPermissionController {
  constructor(private readonly permissionService: DocumentPermissionService) {}

  @Post('share')
  @ApiOperation({ summary: '分享文档给用户' })
  @ApiParam({ name: 'documentId', description: '文档ID' })
  @ApiBody({ type: ShareDocumentDto })
  @ApiResponse({
    status: 200,
    description: '分享成功',
  })
  async shareDocument(
    @Param('documentId') documentId: string,
    @Body() shareDto: ShareDocumentDto,
    @Request() req,
  ) {
    try {
      console.log(
        `[Controller] 分享文档请求: documentId=${documentId}, userId=${req.user.sub}, shareDto=${JSON.stringify(shareDto)}`,
      );

      const permission = await this.permissionService.shareDocument(
        Number(documentId),
        shareDto,
        Number(req.user.sub),
      );

      return {
        success: true,
        data: permission,
        message: '文档分享成功',
      };
    } catch (error) {
      console.error(`[Controller] 分享文档失败:`, error);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: '获取文档的所有权限列表' })
  @ApiParam({ name: 'documentId', description: '文档ID' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  async getDocumentPermissions(
    @Param('documentId') documentId: string,
    @Request() req,
  ) {
    const permissions = await this.permissionService.getDocumentPermissions(
      Number(documentId),
      Number(req.user.sub),
    );

    return {
      success: true,
      data: permissions,
    };
  }

  @Put(':permissionId')
  @ApiOperation({ summary: '更新权限' })
  @ApiParam({ name: 'documentId', description: '文档ID' })
  @ApiParam({ name: 'permissionId', description: '权限ID' })
  @ApiBody({ type: UpdatePermissionDto })
  @ApiResponse({
    status: 200,
    description: '更新成功',
  })
  async updatePermission(
    @Param('permissionId') permissionId: string,
    @Body() updateDto: UpdatePermissionDto,
    @Request() req,
  ) {
    const permission = await this.permissionService.updatePermission(
      permissionId,
      updateDto,
      Number(req.user.sub),
    );

    return {
      success: true,
      data: permission,
      message: '权限更新成功',
    };
  }

  @Delete(':permissionId')
  @ApiOperation({ summary: '删除权限（取消分享）' })
  @ApiParam({ name: 'documentId', description: '文档ID' })
  @ApiParam({ name: 'permissionId', description: '权限ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  async removePermission(
    @Param('permissionId') permissionId: string,
    @Request() req,
  ) {
    await this.permissionService.removePermission(
      permissionId,
      Number(req.user.sub),
    );

    return {
      success: true,
      data: null,
      message: '权限已删除',
    };
  }

  @Get('check')
  @ApiOperation({ summary: '检查当前用户对文档的权限' })
  @ApiParam({ name: 'documentId', description: '文档ID' })
  @ApiResponse({
    status: 200,
    description: '权限信息',
  })
  async checkPermission(
    @Param('documentId') documentId: string,
    @Request() req,
  ) {
    const docId = Number(documentId);
    const userId = Number(req.user.sub);

    const permissions = {
      canRead: await this.permissionService.checkPermission(
        userId,
        docId,
        'read',
      ),
      canWrite: await this.permissionService.checkPermission(
        userId,
        docId,
        'write',
      ),
      canDelete: await this.permissionService.checkPermission(
        userId,
        docId,
        'delete',
      ),
      canShare: await this.permissionService.checkPermission(
        userId,
        docId,
        'share',
      ),
    };

    return {
      success: true,
      data: permissions,
    };
  }
}
