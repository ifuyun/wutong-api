import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IpAndAgent = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || req._remoteAddress ||
    req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

  return ip + ' - "' + req.headers['user-agent'] + '"';
});
