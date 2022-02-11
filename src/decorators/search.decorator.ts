import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Search = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return new URL(req.originalUrl, `${req.protocol}://${req.hostname}`).search;
});
