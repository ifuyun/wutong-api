import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../common/common.enum';

export const IsAdmin = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const user = req.session.user;

  return user && user.meta && user.meta.roles === Role.ADMIN;
});
