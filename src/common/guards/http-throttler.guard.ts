import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 仅对 HTTP 请求限流的守卫。
 *
 * 全局 ThrottlerGuard 默认也会拦截 WebSocket 消息处理,但它只能读取 HTTP 上下文,
 * 在 WS 上下文下会抛出 "Cannot read properties of undefined (reading 'get')",
 * 破坏协同编辑的 authenticate / document-edit 等消息。这里对非 HTTP 上下文直接放行。
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    return super.canActivate(context);
  }
}
