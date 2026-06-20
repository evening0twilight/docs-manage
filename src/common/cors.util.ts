/**
 * CORS 来源(origin)统一配置
 *
 * 允许的来源通过环境变量 CORS_ORIGINS 配置(逗号分隔),例如:
 *   CORS_ORIGINS=https://onespecial.me,http://165.227.56.186
 *
 * 说明:
 * - 这里使用「函数式 origin」而非静态数组,因为它在每次请求时(运行时)求值,
 *   此时 ConfigModule 已经把 .env 写入 process.env;而 @WebSocketGateway 装饰器
 *   里的静态表达式在 import 阶段就会被求值,那时 .env 往往还没加载。
 * - 若未配置 CORS_ORIGINS,则回退到本地开发常用来源(localhost / 127.0.0.1)。
 */

/** 本地开发默认允许的来源 */
const DEV_DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/**
 * 解析当前允许的来源列表(运行时读取 process.env)。
 */
export function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (raw && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEV_DEFAULT_ORIGINS;
}

type CorsOriginCallback = (
  err: Error | null,
  origin?: boolean | string | RegExp | Array<string | RegExp>,
) => void;

/**
 * 供 Express(app.enableCors)与 Socket.IO(@WebSocketGateway cors)共用的 origin 校验函数。
 * - 无 Origin 头(同源请求 / 服务端工具)放行。
 * - 命中白名单放行,否则拒绝。
 */
export function corsOrigin(
  requestOrigin: string | undefined,
  callback: CorsOriginCallback,
): void {
  if (!requestOrigin || getAllowedOrigins().includes(requestOrigin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS 不允许的来源: ${requestOrigin}`), false);
}
