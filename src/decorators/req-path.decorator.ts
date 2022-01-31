import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const ReqPath = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return new URL(req.originalUrl, `${req.protocol}://${req.hostname}`).pathname;
});
export default ReqPath;
