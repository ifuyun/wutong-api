import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthToken = createParamDecorator((data, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().headers.authorization;
});
