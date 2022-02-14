import { ExecutionContext, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResponseCode } from '../common/response-code.enum';
import { CustomException } from '../exceptions/custom.exception';

/**
 * JwtAuthGuard只负责校验登录状态，权限校验在AuthGuard
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new CustomException(ResponseCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, 'Unauthorized');
    }
    return user;
  }
}
