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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { DocumentCommentService } from './document-comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('评论管理')
@ApiBearerAuth()
@Controller('documents/:documentId/comments')
@UseGuards(JwtAuthGuard)
export class DocumentCommentController {
  constructor(private readonly commentService: DocumentCommentService) {}

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
    @Request() req: any,
  ) {
    try {
      console.log('[创建评论] 开始处理评论创建请求');
      console.log('[创建评论] documentId:', documentId);
      console.log('[创建评论] createCommentDto:', JSON.stringify(createCommentDto));
      console.log('[创建评论] req.user:', req.user);
      
      const userId: number = req.user?.id || req.user?.sub;
      
      if (!userId) {
        console.error('[创建评论] 错误: 无法获取用户ID', req.user);
        throw new Error('无法获取用户ID，请检查JWT认证');
      }
      
      console.log('[创建评论] userId:', userId);
      
      const comment = await this.commentService.create(
        documentId,
        userId,
        createCommentDto,
      );

      console.log('[创建评论] 评论创建成功:', comment.id);

      // 直接返回评论对象
      return comment;
    } catch (error) {
      console.error('[创建评论] 错误:', error);
      console.error('[创建评论] 错误堆栈:', error.stack);
      throw error;
    }
  }

  /**
   * 获取文档的所有评论
   */
  @Get()
  @ApiOperation({ summary: '获取文档的评论列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getComments(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query('resolved') resolved?: string,
    @Query('includeReplies') includeReplies?: string,
  ) {
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
  async getCommentStats(@Param('documentId', ParseIntPipe) documentId: number) {
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
  async getComment(@Param('commentId', ParseIntPipe) commentId: number) {
    const comment = await this.commentService.findOneWithUser(commentId);

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
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any,
  ) {
    const userId: number = req.user.id;
    const comment = await this.commentService.update(
      commentId,
      userId,
      updateCommentDto,
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
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: any,
  ) {
    const userId: number = req.user.id;
    const comment = await this.commentService.resolve(commentId, userId);

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
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: any,
  ) {
    const userId: number = req.user.id;
    const comment = await this.commentService.reopen(commentId, userId);

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
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: any,
  ) {
    const userId: number = req.user.id;
    const result = await this.commentService.remove(commentId, userId);

    return result;
  }
}
