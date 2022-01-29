import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const IpAndAgent = createParamDecorator((data: any, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || req._remoteAddress ||
    req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

  return ip + ' - "' + req.headers['user-agent'] + '"';
});
export default IpAndAgent;
