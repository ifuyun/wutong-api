import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export default class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {
  }

  canActivate(context: ExecutionContext): boolean {
    // 合并类权限和方法权限
    const roles = this.reflector.getAllAndMerge<string[]>('roles', [
      context.getClass(),
      context.getHandler()
    ]);
    if (!roles) {
      return true;
    }
    const req = context.switchToHttp().getRequest();
    const user = req.session?.user;
    const role = user?.userMeta?.roles;

    // 目前用户角色只限制为一个，因此简单通过includes判断
    return roles.includes(role);
  }
}
