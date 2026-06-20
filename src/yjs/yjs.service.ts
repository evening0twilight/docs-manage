import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { YjsDocumentEntity } from './yjs-document.entity';

/**
 * 基于 Hocuspocus 的 Yjs/CRDT 协同后端
 *
 * - 与前端 y-websocket WebsocketProvider 协议兼容
 * - 连接时校验 JWT(前端经 ws 查询参数 token 传入)
 * - 文档状态持久化到 MySQL(yjs_documents),断线/重启可恢复
 * - 随 NestJS 应用启动,监听独立端口(YJS_PORT,默认 1234)
 */
@Injectable()
export class YjsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('YjsServer');
  private server: Server | null = null;

  constructor(
    @InjectRepository(YjsDocumentEntity)
    private readonly yjsRepo: Repository<YjsDocumentEntity>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    const port = Number(this.configService.get<string>('YJS_PORT', '1234'));

    this.server = new Server({
      port,
      quiet: true,

      // 鉴权:HocuspocusProvider 通过 token 选项发送 JWT(定义了此钩子即强制鉴权)
      onAuthenticate: async ({ token }: { token: string }) => {
        const raw = token?.startsWith('Bearer ') ? token.slice(7) : token;
        if (!raw) {
          throw new Error('未提供认证令牌');
        }
        try {
          await this.jwtService.verifyAsync(raw);
        } catch {
          throw new Error('认证令牌无效或已过期');
        }
      },

      // 首次加载房间:从库中恢复已持久化的 Yjs 状态
      onLoadDocument: async ({
        documentName,
        document,
      }: {
        documentName: string;
        document: Y.Doc;
      }) => {
        const row = await this.yjsRepo.findOne({
          where: { name: documentName },
        });
        if (row?.state) {
          Y.applyUpdate(document, new Uint8Array(row.state));
        }
        return document;
      },

      // 防抖存储:把当前 Yjs 文档状态写回库
      onStoreDocument: async ({
        documentName,
        document,
      }: {
        documentName: string;
        document: Y.Doc;
      }) => {
        const state = Buffer.from(Y.encodeStateAsUpdate(document));
        await this.yjsRepo.save({ name: documentName, state });
      },
    });

    await this.server.listen();
    this.logger.log(`Yjs(Hocuspocus) 协同服务已启动,端口 ${port}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.server) {
      await this.server.destroy();
      this.server = null;
    }
  }
}
