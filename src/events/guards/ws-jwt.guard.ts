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
    } catch (error) {
      client.disconnect();
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    // 从握手认证头中获取 token
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      return type === 'Bearer' ? token : null;
    }

    // 或从查询参数中获取
    const token = client.handshake?.query?.token;
    return typeof token === 'string' ? token : null;
  }
}
