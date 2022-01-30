import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const ReqPath = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return new URL(req.url).pathname;
});
export default ReqPath;
