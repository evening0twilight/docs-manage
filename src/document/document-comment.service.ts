import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DocumentComment } from './document-comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { FileSystemItemEntity } from './document.entity';

@Injectable()
export class DocumentCommentService {
  constructor(
    @InjectRepository(DocumentComment)
    private readonly commentRepository: Repository<DocumentComment>,
    @InjectRepository(FileSystemItemEntity)
    private readonly documentRepository: Repository<FileSystemItemEntity>,
  ) {}

  /**
   * 创建评论
   */
  async create(
    documentId: number,
    userId: number,
    createCommentDto: CreateCommentDto,
  ) {
    try {
      console.log('[CommentService] 开始创建评论');
      console.log('[CommentService] documentId:', documentId);
      console.log('[CommentService] userId:', userId);
      console.log('[CommentService] createCommentDto:', createCommentDto);

      // 验证文档是否存在
      const document = await this.documentRepository.findOne({
        where: { id: documentId, isDeleted: false },
      });

      console.log('[CommentService] 文档查询结果:', document ? `存在 (id: ${document.id})` : '不存在');

      if (!document) {
        throw new NotFoundException('文档不存在');
      }

      // 验证位置范围
      if (createCommentDto.startPos > createCommentDto.endPos) {
        throw new BadRequestException('起始位置不能大于结束位置');
      }

      // 如果是回复，验证父评论是否存在
      if (createCommentDto.parentId) {
        console.log('[CommentService] 这是一个回复, parentId:', createCommentDto.parentId);
        
        const parentComment = await this.commentRepository.findOne({
          where: {
            id: createCommentDto.parentId,
            documentId,
            deletedAt: IsNull(),
          },
        });

        if (!parentComment) {
          throw new NotFoundException('父评论不存在');
        }

        // 更新父评论的回复计数
        await this.commentRepository.increment(
          { id: createCommentDto.parentId },
          'replyCount',
          1,
        );
      }

      // 创建评论
      console.log('[CommentService] 准备创建评论对象');
      const comment = this.commentRepository.create({
        documentId,
        userId,
        ...createCommentDto,
      });

      console.log('[CommentService] 评论对象创建成功，准备保存');
      const savedComment = await this.commentRepository.save(comment);
      console.log('[CommentService] 评论保存成功, id:', savedComment.id);

      // 返回带用户信息的评论
      console.log('[CommentService] 查询完整评论信息');
      const fullComment = await this.findOneWithUser(savedComment.id);
      console.log('[CommentService] 评论创建完成');
      
      return fullComment;
    } catch (error) {
      console.error('[CommentService] 创建评论失败:', error);
      console.error('[CommentService] 错误堆栈:', error.stack);
      throw error;
    }
  }

  /**
   * 获取文档的所有评论
   */
  async findByDocument(
    documentId: number,
    options?: {
      resolved?: boolean;
      includeReplies?: boolean;
    },
  ) {
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.resolver', 'resolver')
      .where('comment.documentId = :documentId', { documentId })
      .andWhere('comment.deletedAt IS NULL')
      .andWhere('comment.parentId IS NULL'); // 只查询顶级评论

    // 过滤已解决/未解决
    if (options?.resolved !== undefined) {
      queryBuilder.andWhere('comment.resolved = :resolved', {
        resolved: options.resolved,
      });
    }

    queryBuilder.orderBy('comment.createdAt', 'DESC');

    const comments = await queryBuilder.getMany();

    // 如果需要包含回复
    if (options?.includeReplies) {
      for (const comment of comments) {
        comment['replies'] = await this.findReplies(comment.id);
      }
    }

    return comments;
  }

  /**
   * 获取评论的回复列表
   */
  async findReplies(commentId: number) {
    return this.commentRepository.find({
      where: {
        parentId: commentId,
        deletedAt: IsNull(),
      },
      relations: ['user', 'resolver'],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * 获取单个评论（带用户信息）
   */
  async findOneWithUser(commentId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, deletedAt: IsNull() },
      relations: ['user', 'resolver'],
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    return comment;
  }

  /**
   * 更新评论内容
   */
  async update(
    commentId: number,
    userId: number,
    updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, deletedAt: IsNull() },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 只有评论作者可以编辑
    if (comment.userId !== userId) {
      throw new ForbiddenException('您无权编辑此评论');
    }

    // 更新评论
    Object.assign(comment, updateCommentDto);
    await this.commentRepository.save(comment);

    return this.findOneWithUser(commentId);
  }

  /**
   * 解决评论
   */
  async resolve(commentId: number, userId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, deletedAt: IsNull() },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.resolved) {
      throw new BadRequestException('评论已被解决');
    }

    // 标记为已解决
    comment.resolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = new Date();

    await this.commentRepository.save(comment);

    return this.findOneWithUser(commentId);
  }

  /**
   * 重新打开评论
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async reopen(commentId: number, userId: number) {
    // TODO: 可以添加权限检查，例如只允许评论作者或文档所有者重新打开
    // 目前 userId 参数保留供将来使用
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, deletedAt: IsNull() },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (!comment.resolved) {
      throw new BadRequestException('评论未被解决');
    }

    // 重新打开
    comment.resolved = false;
    comment.resolvedBy = null;
    comment.resolvedAt = null;

    await this.commentRepository.save(comment);

    return this.findOneWithUser(commentId);
  }

  /**
   * 删除评论（软删除）
   */
  async remove(commentId: number, userId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, deletedAt: IsNull() },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 只有评论作者可以删除
    if (comment.userId !== userId) {
      throw new ForbiddenException('您无权删除此评论');
    }

    // 软删除
    comment.deletedAt = new Date();
    await this.commentRepository.save(comment);

    // 如果有父评论，更新父评论的回复计数
    if (comment.parentId) {
      await this.commentRepository.decrement(
        { id: comment.parentId },
        'replyCount',
        1,
      );
    }

    return { success: true, message: '评论已删除' };
  }

  /**
   * 获取评论数量统计
   */
  async getCommentStats(documentId: number) {
    const [total, resolved, unresolved] = await Promise.all([
      this.commentRepository.count({
        where: { documentId, deletedAt: IsNull(), parentId: IsNull() },
      }),
      this.commentRepository.count({
        where: {
          documentId,
          deletedAt: IsNull(),
          parentId: IsNull(),
          resolved: true,
        },
      }),
      this.commentRepository.count({
        where: {
          documentId,
          deletedAt: IsNull(),
          parentId: IsNull(),
          resolved: false,
        },
      }),
    ]);

    return {
      total,
      resolved,
      unresolved,
    };
  }
}
