import { ExecutionContext, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ResponseCode } from '../common/response-codes.enum';
import { CustomException } from '../exceptions/custom.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private context: ExecutionContext;

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    this.context = context;
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new CustomException(ResponseCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, 'Unauthorized');
    }
    // 合并类权限和方法权限
    const roles = this.reflector.getAllAndMerge<string[]>('roles', [
      this.context.getClass(),
      this.context.getHandler()
    ]);
    if (!roles || roles.length < 1) {
      return true;
    }
    const role = user?.meta?.roles;
    // 目前用户角色只限制为一个，因此简单通过includes判断
    if (!roles.includes(role)) {
      throw new CustomException(ResponseCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, 'Unauthorized');
    }
    return user;
  }
}
