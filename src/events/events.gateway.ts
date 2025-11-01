import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';

interface UserInfo {
  userId: string;
  username: string;
  avatar?: string;
}

interface DocumentRoom {
  documentId: string;
  users: Map<string, UserInfo>; // socketId -> UserInfo
}

interface CursorPosition {
  userId: string;
  username: string;
  position: { line: number; column: number };
  color: string;
}

interface DocumentEdit {
  userId: string;
  username: string;
  type: 'insert' | 'delete' | 'replace';
  content: string;
  position: { line: number; column: number };
  timestamp: number;
}

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'https://onespecial.me',
    ],
    credentials: true,
  },
  namespace: '/ws',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');
  private connectedUsers: Map<string, UserInfo> = new Map(); // socketId -> UserInfo
  private documentRooms: Map<string, DocumentRoom> = new Map(); // documentId -> DocumentRoom
  private userColors: Map<string, string> = new Map(); // userId -> color

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway 初始化完成');
  }

  handleConnection(client: Socket) {
    this.logger.log(`客户端连接: ${client.id}`);

    // 发送连接成功消息
    client.emit('connected', {
      message: 'WebSocket 连接成功',
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);

    if (userInfo) {
      // 从所有文档房间中移除该用户
      this.documentRooms.forEach((room, documentId) => {
        if (room.users.has(client.id)) {
          room.users.delete(client.id);

          // 通知房间内其他用户
          client.to(documentId).emit('user-left', {
            userId: userInfo.userId,
            username: userInfo.username,
            socketId: client.id,
            documentId,
            remainingUsers: Array.from(room.users.values()),
          });

          this.logger.log(
            `用户 ${userInfo.username} 离开文档 ${documentId} (socketId: ${client.id})`,
          );
        }
      });

      this.connectedUsers.delete(client.id);
      this.logger.log(
        `用户 ${userInfo.username} 断开连接 (socketId: ${client.id})`,
      );
    } else {
      this.logger.log(`客户端断开连接: ${client.id}`);
    }
  }

  /**
   * 用户身份认证（绑定 userId 和 socketId）
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: string; username: string; avatar?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, username, avatar } = data;
    const userInfo: UserInfo = { userId, username, avatar };

    this.connectedUsers.set(client.id, userInfo);

    // 为用户分配唯一颜色（用于光标显示）
    if (!this.userColors.has(userId)) {
      this.userColors.set(userId, this.generateRandomColor());
    }

    this.logger.log(`用户 ${username} 已认证 (socketId: ${client.id})`);

    return {
      event: 'authenticated',
      data: {
        success: true,
        userId,
        username,
        socketId: client.id,
        color: this.userColors.get(userId),
      },
    };
  }

  /**
   * 加入文档房间
   */
  @SubscribeMessage('join-document')
  handleJoinDocument(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId } = data;
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      client.emit('error', { message: '请先进行身份认证' });
      return;
    }

    // 加入 Socket.IO 房间
    client.join(documentId);

    // 创建或获取文档房间
    if (!this.documentRooms.has(documentId)) {
      this.documentRooms.set(documentId, {
        documentId,
        users: new Map(),
      });
    }

    const room = this.documentRooms.get(documentId)!;
    room.users.set(client.id, userInfo);

    // 通知房间内其他用户
    client.to(documentId).emit('user-joined', {
      userId: userInfo.userId,
      username: userInfo.username,
      avatar: userInfo.avatar,
      socketId: client.id,
      color: this.userColors.get(userInfo.userId),
      documentId,
    });

    this.logger.log(
      `用户 ${userInfo.username} 加入文档 ${documentId} (socketId: ${client.id})`,
    );

    // 返回当前房间内的所有用户
    return {
      event: 'joined-document',
      data: {
        success: true,
        documentId,
        users: Array.from(room.users.values()).map((user) => ({
          ...user,
          color: this.userColors.get(user.userId),
        })),
      },
    };
  }

  /**
   * 离开文档房间
   */
  @SubscribeMessage('leave-document')
  handleLeaveDocument(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId } = data;
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      return;
    }

    // 离开 Socket.IO 房间
    client.leave(documentId);

    // 从文档房间中移除
    const room = this.documentRooms.get(documentId);
    if (room) {
      room.users.delete(client.id);

      // 通知房间内其他用户
      client.to(documentId).emit('user-left', {
        userId: userInfo.userId,
        username: userInfo.username,
        socketId: client.id,
        documentId,
        remainingUsers: Array.from(room.users.values()),
      });

      this.logger.log(
        `用户 ${userInfo.username} 离开文档 ${documentId} (socketId: ${client.id})`,
      );
    }

    return {
      event: 'left-document',
      data: {
        success: true,
        documentId,
      },
    };
  }

  /**
   * 文档编辑（实时同步）
   */
  @SubscribeMessage('document-edit')
  handleDocumentEdit(
    @MessageBody() data: DocumentEdit & { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      client.emit('error', { message: '请先进行身份认证' });
      return;
    }

    const { documentId, type, content, position } = data;

    // 广播给房间内其他用户（不包括发送者）
    client.to(documentId).emit('document-edit', {
      userId: userInfo.userId,
      username: userInfo.username,
      type,
      content,
      position,
      timestamp: Date.now(),
      socketId: client.id,
    });

    this.logger.debug(
      `文档 ${documentId} 编辑: ${type} by ${userInfo.username}`,
    );
  }

  /**
   * 光标位置更新
   */
  @SubscribeMessage('cursor-position')
  handleCursorPosition(
    @MessageBody()
    data: {
      documentId: string;
      position: { line: number; column: number };
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      return;
    }

    const { documentId, position } = data;

    // 广播给房间内其他用户
    client.to(documentId).emit('cursor-position', {
      userId: userInfo.userId,
      username: userInfo.username,
      position,
      color: this.userColors.get(userInfo.userId),
      socketId: client.id,
    });
  }

  /**
   * 文档选中范围更新
   */
  @SubscribeMessage('selection-change')
  handleSelectionChange(
    @MessageBody()
    data: {
      documentId: string;
      selection: {
        start: { line: number; column: number };
        end: { line: number; column: number };
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      return;
    }

    const { documentId, selection } = data;

    // 广播给房间内其他用户
    client.to(documentId).emit('selection-change', {
      userId: userInfo.userId,
      username: userInfo.username,
      selection,
      color: this.userColors.get(userInfo.userId),
      socketId: client.id,
    });
  }

  /**
   * 用户正在输入状态
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { documentId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      return;
    }

    const { documentId, isTyping } = data;

    // 广播给房间内其他用户
    client.to(documentId).emit('user-typing', {
      userId: userInfo.userId,
      username: userInfo.username,
      isTyping,
      socketId: client.id,
    });
  }

  /**
   * 发送聊天消息
   */
  @SubscribeMessage('chat-message')
  handleChatMessage(
    @MessageBody() data: { documentId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      client.emit('error', { message: '请先进行身份认证' });
      return;
    }

    const { documentId, message } = data;

    // 广播给房间内所有用户（包括发送者）
    this.server.to(documentId).emit('chat-message', {
      userId: userInfo.userId,
      username: userInfo.username,
      avatar: userInfo.avatar,
      message,
      timestamp: new Date().toISOString(),
      socketId: client.id,
    });

    this.logger.debug(
      `文档 ${documentId} 聊天: ${userInfo.username}: ${message}`,
    );
  }

  /**
   * 获取在线用户数
   */
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * 获取文档房间内的用户
   */
  getDocumentUsers(documentId: string): UserInfo[] {
    const room = this.documentRooms.get(documentId);
    return room ? Array.from(room.users.values()) : [];
  }

  /**
   * 生成随机颜色（用于光标显示）
   */
  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
      '#F8B739',
      '#52B788',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
