import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const UserAgent = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.headers['user-agent'];
});
export default UserAgent;
