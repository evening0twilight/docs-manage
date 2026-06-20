import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect();
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      // 将用户信息附加到 socket 对象上
      client.data.user = payload;
      return true;
    } catch {
      client.disconnect();
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    const stripBearer = (v: string): string =>
      v.startsWith('Bearer ') ? v.slice(7) : v;

    // 1) socket.io 的 auth 负载:io(url, { auth: { token: 'Bearer xxx' } })(前端使用此方式)
    const authToken = client.handshake?.auth?.token as unknown;
    if (typeof authToken === 'string' && authToken) {
      return stripBearer(authToken);
    }

    // 2) 从握手认证头中获取 token
    const authHeader = client.handshake?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader) {
      return stripBearer(authHeader);
    }

    // 3) 或从查询参数中获取
    const token = client.handshake?.query?.token;
    return typeof token === 'string' && token ? stripBearer(token) : null;
  }
}
