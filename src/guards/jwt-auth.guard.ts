import { ExecutionContext, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResponseCode } from '../common/response-codes.enum';
import { CustomException } from '../exceptions/custom.exception';

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
