import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../common/common.enum';

const IsAdmin = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const user = req.session.user;

  return user && user.userMeta && user.userMeta.roles === Role.ADMIN;
});
export default IsAdmin;
