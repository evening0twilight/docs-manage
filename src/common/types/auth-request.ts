/**
 * 经 JwtAuthGuard 处理后的请求类型。
 * 守卫会把 JWT 载荷挂到 request.user 上(载荷使用 sub 作为用户 ID)。
 */
export interface AuthRequest {
  user?: {
    id?: number;
    sub?: number;
    username?: string;
    email?: string;
  };
}
