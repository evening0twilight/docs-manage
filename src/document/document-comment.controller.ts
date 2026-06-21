import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { DocumentCommentService } from './document-comment.service';
import { DocumentAccessService } from './document-access.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AuthRequest } from '../common/types/auth-request';

@ApiTags('评论管理')
@ApiBearerAuth()
@Controller('documents/:documentId/comments')
@UseGuards(JwtAuthGuard)
export class DocumentCommentController {
  private readonly logger = new Logger(DocumentCommentController.name);

  constructor(
    private readonly commentService: DocumentCommentService,
    private readonly accessService: DocumentAccessService,
  ) {}

  /** 从请求中提取并校验 userId(JWT 载荷使用 sub) */
  private getUserId(req: AuthRequest): number {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('用户身份验证失败');
    }
    return Number(userId);
  }

  /**
   * 创建评论
   */
  @Post()
  @ApiOperation({ summary: '创建评论' })
  @ApiResponse({ status: 201, description: '评论创建成功' })
  @ApiResponse({ status: 404, description: '文档不存在' })
  async createComment(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    this.logger.debug(`用户 ${userId} 为文档 ${documentId} 创建评论`);
    return await this.commentService.create(
      documentId,
      userId,
      createCommentDto,
    );
  }

  /**
   * 获取文档的所有评论
   */
  @Get()
  @ApiOperation({ summary: '获取文档的评论列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getComments(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Request() req: AuthRequest,
    @Query('resolved') resolved?: string,
    @Query('includeReplies') includeReplies?: string,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);

    const options: {
      resolved?: boolean;
      includeReplies?: boolean;
    } = {};

    if (resolved !== undefined) {
      options.resolved = resolved === 'true';
    }

    if (includeReplies !== undefined) {
      options.includeReplies = includeReplies === 'true';
    }

    const comments = await this.commentService.findByDocument(
      documentId,
      options,
    );

    return {
      success: true,
      data: comments,
    };
  }

  /**
   * 获取评论统计
   */
  @Get('stats')
  @ApiOperation({ summary: '获取评论统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCommentStats(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    const stats = await this.commentService.getCommentStats(documentId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 获取单个评论
   */
  @Get(':commentId')
  @ApiOperation({ summary: '获取单个评论详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  async getComment(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    const comment = await this.commentService.findOneWithUser(
      commentId,
      documentId,
    );

    return {
      success: true,
      data: comment,
    };
  }

  /**
   * 更新评论
   */
  @Put(':commentId')
  @ApiOperation({ summary: '更新评论内容' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '无权编辑' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  async updateComment(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    const comment = await this.commentService.update(
      commentId,
      userId,
      updateCommentDto,
      documentId,
    );

    return {
      success: true,
      data: comment,
      message: '评论更新成功',
    };
  }

  /**
   * 解决评论
   */
  @Put(':commentId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记评论为已解决' })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  async resolveComment(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    const comment = await this.commentService.resolve(
      commentId,
      userId,
      documentId,
    );

    return {
      success: true,
      data: comment,
      message: '评论已标记为解决',
    };
  }

  /**
   * 重新打开评论
   */
  @Put(':commentId/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重新打开已解决的评论' })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  async reopenComment(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    const comment = await this.commentService.reopen(
      commentId,
      userId,
      documentId,
    );

    return {
      success: true,
      data: comment,
      message: '评论已重新打开',
    };
  }

  /**
   * 删除评论
   */
  @Delete(':commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除评论' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '无权删除' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  async deleteComment(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    await this.accessService.assertCanRead(documentId, userId);
    const result = await this.commentService.remove(
      commentId,
      userId,
      documentId,
    );

    return result;
  }
}
