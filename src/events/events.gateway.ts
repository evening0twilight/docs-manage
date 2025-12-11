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
import { Logger } from '@nestjs/common';
// import { UseGuards } from '@nestjs/common'; // 如果需要使用守卫再取消注释
// import { WsJwtGuard } from './guards/ws-jwt.guard'; // 如果需要使用守卫再取消注释

interface UserInfo {
  userId: string;
  username: string;
  avatar?: string;
  color?: string; // 光标颜色
}

interface DocumentRoom {
  documentId: string;
  users: Map<string, UserInfo>; // socketId -> UserInfo
}

// interface CursorPosition {  // 暂未使用,需要时取消注释
//   userId: string;
//   username: string;
//   position: { line: number; column: number };
//   color: string;
// }

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
  private userSessions: Map<string, string> = new Map(); // userId -> socketId (最新登录)
  private colorPool: string[] = [
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
  private usedColors: Set<string> = new Set(); // 跟踪已使用的颜色

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  afterInit(_server: Server) {
    // 使用 _server 前缀表示参数未使用但是接口要求
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

      // 清理用户会话(仅当是当前socketId时)
      if (this.userSessions.get(userInfo.userId) === client.id) {
        this.userSessions.delete(userInfo.userId);

        // 释放用户颜色
        const color = this.userColors.get(userInfo.userId);
        if (color) {
          this.usedColors.delete(color);
          this.userColors.delete(userInfo.userId);
          this.logger.log(`释放用户 ${userInfo.username} 的颜色: ${color}`);
        }
      }

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

    // 检查该用户是否已在其他地方登录
    const existingSocketId = this.userSessions.get(userId);
    if (existingSocketId && existingSocketId !== client.id) {
      // 找到旧的socket连接
      const oldSocket = this.server.sockets.sockets.get(existingSocketId);
      if (oldSocket) {
        this.logger.log(
          `用户 ${username} (${userId}) 在其他地方登录，踢出旧连接 ${existingSocketId}`,
        );

        // 通知旧连接被踢下线
        oldSocket.emit('force-logout', {
          message: '您的账号已在其他地方登录',
          timestamp: new Date().toISOString(),
        });

        // 断开旧连接
        oldSocket.disconnect(true);

        // 清理旧连接的数据
        this.connectedUsers.delete(existingSocketId);
      }
    }

    // 保存新的连接
    this.connectedUsers.set(client.id, userInfo);
    this.userSessions.set(userId, client.id);

    // 为用户分配唯一颜色（用于光标显示）
    this.assignColorToUser(userId);

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
    void client.join(documentId); // 使用 void 标记表示有意忽略 Promise

    // 创建或获取文档房间
    if (!this.documentRooms.has(documentId)) {
      this.documentRooms.set(documentId, {
        documentId,
        users: new Map(),
      });
    }

    const room = this.documentRooms.get(documentId)!;
    room.users.set(client.id, userInfo);

    this.logger.log(
      `用户 ${userInfo.username} 加入文档 ${documentId} (socketId: ${client.id})`,
    );
    this.logger.log(
      `当前文档房间共 ${room.users.size} 人: ${Array.from(room.users.values())
        .map((u) => u.username)
        .join(', ')}`,
    );

    // 通知房间内其他用户
    client.to(documentId).emit('user-joined', {
      userId: userInfo.userId,
      username: userInfo.username,
      avatar: userInfo.avatar,
      socketId: client.id,
      color: this.userColors.get(userInfo.userId),
      documentId,
    });

    // 返回当前房间内的所有用户
    const usersInRoom = Array.from(room.users.values()).map((user) => ({
      ...user,
      color: this.userColors.get(user.userId),
    }));

    this.logger.log(
      `返回joined-document事件,包含 ${usersInRoom.length} 个用户: ${JSON.stringify(usersInRoom.map((u) => ({ username: u.username, userId: u.userId, color: u.color })))}`,
    );

    return {
      event: 'joined-document',
      data: {
        success: true,
        documentId,
        users: usersInRoom,
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
    void client.leave(documentId); // 使用 void 标记表示有意忽略 Promise

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
    @MessageBody()
    data: DocumentEdit & { documentId: string; from?: number; to?: number; openStart?: number; openEnd?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      client.emit('error', { message: '请先进行身份认证' });
      return;
    }

    const { documentId, type, content, position, from, to, openStart, openEnd } = data;

    // 广播给房间内其他用户（不包括发送者）
    client.to(documentId).emit('document-edit', {
      userId: userInfo.userId,
      username: userInfo.username,
      type,
      content,
      position,
      from,
      to,
      openStart,
      openEnd,
      timestamp: Date.now(),
      socketId: client.id,
    });

    this.logger.debug(
      `文档 ${documentId} 编辑: ${type} by ${userInfo.username}, from=${from}, to=${to}, openStart=${openStart}, openEnd=${openEnd}`,
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

    this.logger.debug(
      `收到光标位置: ${userInfo.username} (${userInfo.userId}) - line: ${position.line}, col: ${position.column}`,
    );

    // 广播给房间内其他用户
    const broadcastData = {
      userId: userInfo.userId,
      username: userInfo.username,
      position,
      color: this.userColors.get(userInfo.userId),
      socketId: client.id,
    };

    this.logger.debug(
      `广播光标位置到文档房间 ${documentId}: ${JSON.stringify(broadcastData)}`,
    );

    client.to(documentId).emit('cursor-position', broadcastData);
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
   * 更新光标颜色
   */
  @SubscribeMessage('update-cursor-color')
  handleUpdateCursorColor(
    @MessageBody() data: { color: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);

    if (!userInfo) {
      client.emit('error', { message: '请先进行身份认证' });
      return;
    }

    // 更新用户颜色
    userInfo.color = data.color;
    this.connectedUsers.set(client.id, userInfo);

    // 广播给所有文档房间（用户可能在多个房间）
    this.documentRooms.forEach((room, documentId) => {
      if (room.users.has(client.id)) {
        // 更新房间中的用户信息
        room.users.set(client.id, userInfo);

        // 广播给房间内所有用户
        this.server.to(documentId).emit('user-color-updated', {
          userId: userInfo.userId,
          color: data.color,
        });
      }
    });

    this.logger.debug(
      `用户 ${userInfo.username} 更新光标颜色为: ${data.color}`,
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
   * 通知文档权限更新
   */
  notifyPermissionUpdate(documentId: string, userId: string, permission: any) {
    this.logger.log(
      `通知权限更新: documentId=${documentId}, userId=${userId}, permission=${JSON.stringify(permission)}`,
    );

    // 找到该用户的所有连接
    const userSockets: string[] = [];
    this.connectedUsers.forEach((userInfo, socketId) => {
      if (userInfo.userId === userId) {
        userSockets.push(socketId);
      }
    });

    // 向该用户的所有连接发送权限更新通知
    userSockets.forEach((socketId) => {
      this.server.to(socketId).emit('permission-updated', {
        documentId,
        userId,
        permission,
        timestamp: new Date().toISOString(),
      });
    });

    // 同时通知文档房间内的所有人(让owner知道权限已更新)
    this.server.to(documentId).emit('document-permission-changed', {
      documentId,
      userId,
      permission,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 通知协同功能状态变化
   */
  notifyCollaborationToggle(
    documentId: string,
    enabled: boolean,
    ownerId: string,
  ) {
    this.logger.log(
      `通知协同状态变化: documentId=${documentId}, enabled=${enabled}, ownerId=${ownerId}`,
    );

    this.server.to(documentId).emit('collaboration-toggled', {
      documentId,
      enabled,
      ownerId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 分配不重复的颜色给用户
   */
  private assignColorToUser(userId: string): string {
    // 如果用户已经有颜色,直接返回
    if (this.userColors.has(userId)) {
      return this.userColors.get(userId)!;
    }

    // 找到未使用的颜色
    let color: string;
    const availableColors = this.colorPool.filter(
      (c) => !this.usedColors.has(c),
    );

    if (availableColors.length > 0) {
      // 有可用颜色,从中选一个
      color =
        availableColors[Math.floor(Math.random() * availableColors.length)];
    } else {
      // 所有颜色都在使用中,循环使用(从池中随机选)
      color = this.colorPool[Math.floor(Math.random() * this.colorPool.length)];
    }

    this.userColors.set(userId, color);
    this.usedColors.add(color);

    this.logger.log(`为用户 ${userId} 分配颜色: ${color}`);
    return color;
  }

  /**
   * 生成随机颜色（用于光标显示）
   * @deprecated 使用 assignColorToUser 代替,以确保颜色不重复
   */
  private generateRandomColor(): string {
    return this.assignColorToUser('temp-' + Date.now());
  }
}
