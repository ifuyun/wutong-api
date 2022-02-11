import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Url = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.originalUrl || req.url;
});
