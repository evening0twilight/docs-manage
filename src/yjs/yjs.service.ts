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
import { DocumentAccessService } from '../document/document-access.service';

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
    private readonly documentAccess: DocumentAccessService,
  ) {}

  async onModuleInit(): Promise<void> {
    const port = Number(this.configService.get<string>('YJS_PORT', '1234'));

    this.server = new Server({
      port,
      quiet: true,

      // 鉴权 + 文档级授权:不仅校验 JWT,还要校验该用户对该文档的读/写权限,
      // 否则任何登录用户都能通过 ws 直接读写任意私有/未开启协同的文档(IDOR,绕过 HTTP 层)。
      onAuthenticate: async ({
        token,
        documentName,
        connectionConfig,
      }: {
        token: string;
        documentName: string;
        connectionConfig: { readOnly: boolean };
      }) => {
        const raw = token?.startsWith('Bearer ') ? token.slice(7) : token;
        if (!raw) {
          throw new Error('未提供认证令牌');
        }

        let payload: { sub?: number | string };
        try {
          payload = await this.jwtService.verifyAsync(raw);
        } catch {
          throw new Error('认证令牌无效或已过期');
        }
        const userId = Number(payload?.sub);
        if (!userId) {
          throw new Error('认证令牌缺少用户信息');
        }

        // 房间名形如 'document-<id>',解析出文档 id 做权限校验
        const match = /^document-(\d+)$/.exec(documentName);
        if (!match) {
          throw new Error('非法的协同房间名');
        }
        const documentId = Number(match[1]);

        // 先尝试写权限;无写权限则降级为只读连接;读权限也没有则拒绝接入
        try {
          await this.documentAccess.assertCanWrite(documentId, userId);
        } catch {
          try {
            await this.documentAccess.assertCanRead(documentId, userId);
            connectionConfig.readOnly = true;
          } catch {
            throw new Error('无权访问此文档');
          }
        }

        return { userId, documentId };
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
        // 用 upsert 而非 save:save 会先按主键 SELECT 把已有 longblob 整列回读做 diff,
        // 每次防抖落盘都多一轮往返 + 大字段读带宽。upsert 直接 INSERT ... ON DUPLICATE KEY UPDATE。
        await this.yjsRepo.upsert({ name: documentName, state }, ['name']);
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
