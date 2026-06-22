import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DocumentComment } from './document-comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { FileSystemItemEntity } from './document.entity';

@Injectable()
export class DocumentCommentService {
  private readonly logger = new Logger(DocumentCommentService.name);

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
    // 验证文档是否存在
    const document = await this.documentRepository.findOne({
      where: { id: documentId, isDeleted: false },
    });
    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    // 验证位置范围
    if (createCommentDto.startPos > createCommentDto.endPos) {
      throw new BadRequestException('起始位置不能大于结束位置');
    }

    // 如果是回复，验证父评论是否存在
    if (createCommentDto.parentId) {
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
    }

    // 创建评论;若为回复,则保存与父评论计数递增放入同一事务,
    // 先保存成功再递增,避免保存失败时计数被提前累加导致漂移。
    const comment = this.commentRepository.create({
      documentId,
      userId,
      ...createCommentDto,
    });
    const savedComment = await this.commentRepository.manager.transaction(
      async (em) => {
        const saved = await em.save(comment);
        if (createCommentDto.parentId) {
          await em.increment(
            DocumentComment,
            { id: createCommentDto.parentId },
            'replyCount',
            1,
          );
        }
        return saved;
      },
    );
    this.logger.debug(
      `用户 ${userId} 在文档 ${documentId} 创建评论 ${savedComment.id}`,
    );

    // 返回带用户信息的评论
    return this.findOneWithUser(savedComment.id);
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
    // 关联 user/resolver 只取展示所需列(id/username/avatar),不返回整张 UserEntity
    // (含 email/phone/bio 等 PII),既减小响应体也收敛信息暴露面。
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoin('comment.user', 'user')
      .addSelect(['user.id', 'user.username', 'user.avatar'])
      .leftJoin('comment.resolver', 'resolver')
      .addSelect(['resolver.id', 'resolver.username'])
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

    // 如果需要包含回复:一次性批量查询所有回复,避免 N+1
    if (options?.includeReplies && comments.length > 0) {
      const commentIds = comments.map((c) => c.id);
      const allReplies = await this.commentRepository
        .createQueryBuilder('comment')
        .leftJoin('comment.user', 'user')
        .addSelect(['user.id', 'user.username', 'user.avatar'])
        .leftJoin('comment.resolver', 'resolver')
        .addSelect(['resolver.id', 'resolver.username'])
        .where('comment.parentId IN (:...commentIds)', { commentIds })
        .andWhere('comment.deletedAt IS NULL')
        .orderBy('comment.createdAt', 'ASC')
        .getMany();

      const repliesMap = new Map<number, DocumentComment[]>();
      for (const reply of allReplies) {
        const parentId = reply.parentId as number;
        const list = repliesMap.get(parentId);
        if (list) {
          list.push(reply);
        } else {
          repliesMap.set(parentId, [reply]);
        }
      }

      for (const comment of comments) {
        comment['replies'] = repliesMap.get(comment.id) || [];
      }
    }

    return comments;
  }

  /**
   * 获取评论的回复列表
   */
  async findReplies(commentId: number) {
    return this.commentRepository
      .createQueryBuilder('comment')
      .leftJoin('comment.user', 'user')
      .addSelect(['user.id', 'user.username', 'user.avatar'])
      .leftJoin('comment.resolver', 'resolver')
      .addSelect(['resolver.id', 'resolver.username'])
      .where('comment.parentId = :commentId', { commentId })
      .andWhere('comment.deletedAt IS NULL')
      .orderBy('comment.createdAt', 'ASC')
      .getMany();
  }

  /**
   * 获取单个评论（带用户信息）
   */
  async findOneWithUser(commentId: number, documentId?: number) {
    // 传入 documentId 时一并约束,防止跨文档读取他人文档的评论
    const qb = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoin('comment.user', 'user')
      .addSelect(['user.id', 'user.username', 'user.avatar'])
      .leftJoin('comment.resolver', 'resolver')
      .addSelect(['resolver.id', 'resolver.username'])
      .where('comment.id = :commentId', { commentId })
      .andWhere('comment.deletedAt IS NULL');
    if (documentId !== undefined) {
      qb.andWhere('comment.documentId = :documentId', { documentId });
    }
    const comment = await qb.getOne();

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
    documentId: number,
  ) {
    // 约束 documentId,防止跨文档越权编辑(IDOR)
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, documentId, deletedAt: IsNull() },
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
  async resolve(commentId: number, userId: number, documentId: number) {
    // 约束 documentId,防止跨文档越权操作他人文档的评论(IDOR)
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, documentId, deletedAt: IsNull() },
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
  async reopen(commentId: number, userId: number, documentId: number) {
    // 约束 documentId,防止跨文档越权(与 resolve 一致:读权限由控制器 assertCanRead 把关)
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, documentId, deletedAt: IsNull() },
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
  async remove(commentId: number, userId: number, documentId: number) {
    // 约束 documentId,防止跨文档越权删除(IDOR)
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, documentId, deletedAt: IsNull() },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 只有评论作者可以删除
    if (comment.userId !== userId) {
      throw new ForbiddenException('您无权删除此评论');
    }

    // 软删除 + 父评论回复计数递减,放入事务保证一致性(避免计数漂移)
    await this.commentRepository.manager.transaction(async (em) => {
      comment.deletedAt = new Date();
      await em.save(comment);
      if (comment.parentId) {
        await em.decrement(
          DocumentComment,
          { id: comment.parentId },
          'replyCount',
          1,
        );
      }
    });

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
