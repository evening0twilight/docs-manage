export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  username: string; // 可以是用户名或邮箱
  password: string;
}

export interface TokenPayload {
  sub: number; // 用户ID
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

export interface RefreshTokenDto {
  refreshToken: string;
}
