import { Injectable, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getRepository, Repository } from 'typeorm';
import { DocumentEntity } from './document.entity';
import { DocumentRo } from './interfaces/docs.interface';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  // 创建文章
  async create(post: Partial<DocumentEntity>): Promise<DocumentEntity> {
    const { title } = post;
    if (!title) {
      throw new HttpException('缺少文章标题', 401);
    }

    const doc = await this.documentRepository.findOne({ where: { title } });
    if (doc) {
      throw new HttpException('文章已存在', 401);
    }
    return await this.documentRepository.save(post);
  }

  // 获取文章列表
  async findDocsList(query): Promise<DocumentRo> {
    // 使用 TypeORM 的 createQueryBuilder 创建查询构建器
    // doc 是分配给实体表的别名
    const qb = await getRepository(DocumentEntity).createQueryBuilder('doc');
    qb.where('1=1'); // 初始条件，始终为真(占位符用)
    qb.orderBy('doc.created_time', 'DESC'); // 按创建时间降序排列

    const count = await qb.getCount(); // 获取总数
    const { pageNum = 1, pageSize = 10, ...params } = query; // 获取分页参数，并解构出其他参数
    // 设置SQL的 LIMIT 和 OFFSET 实现分页查询
    qb.limit(pageSize); // 设置每页数量
    qb.offset(pageSize * (pageNum - 1)); // 设置偏移量

    // 获取当前页的数据列表
    const docs = await qb.getMany();
    // 这里的返回值注意要和之前的接口定义一致
    return { list: docs, count: count };
  }

  // 获取文章详情
  async findDocsOne(id: number): Promise<DocumentEntity> {
    return await this.documentRepository.findOne(id);
  }

  // 更新文章
  async updateById(
    id: number,
    post: Partial<DocumentEntity>,
  ): Promise<DocumentEntity> {
    const existPost = await this.documentRepository.findOne(id);
    if (!existPost) {
      throw new HttpException('文章不存在', 401);
    }
    const updatedPost = this.documentRepository.merge(existPost, post);
    return this.documentRepository.save(updatedPost);
  }

  // 删除文章
  async remove(id: number) {
    const existPost = await this.documentRepository.findOne(id);
    if (!existPost) {
      throw new HttpException(`id为${id}的文章不存在`, 401);
    }
    return this.documentRepository.remove(existPost);
  }
}
