import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Referer = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  let referer: string = req.headers.referer || req.headers.referrer;
  if (typeof data === 'boolean' && data) {
    referer = referer.split('?')[0].split('#')[0];
  }
  return referer;
});
