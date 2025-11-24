import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../user.entity';

export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  tokenVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    // 验证 tokenVersion
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (
      payload.tokenVersion !== undefined &&
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException(
        '账号已在其他地方登录，若非本人操作，请立刻修改密码',
      );
    }

    return {
      sub: payload.sub,
      username: payload.username,
      email: payload.email,
    };
  }
}
