import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ResponseCode } from '../../common/response-code.enum';
import { CustomException } from '../../exceptions/custom.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('auth.secret')
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.userName) {
      throw new CustomException('Unauthorized', HttpStatus.UNAUTHORIZED, ResponseCode.UNAUTHORIZED);
    }
    return {
      userName: payload.userName,
      userEmail: payload.userEmail,
      meta: payload.meta
    };
  }
}
