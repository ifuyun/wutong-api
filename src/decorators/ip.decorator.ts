import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const Ip = createParamDecorator((data: any, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || req._remoteAddress ||
    req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
});
export default Ip;
