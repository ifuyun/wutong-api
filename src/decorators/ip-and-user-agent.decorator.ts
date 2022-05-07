import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getIPAndUserAgent } from '../helpers/request-parser';

export const IPAndUserAgent = createParamDecorator(
  (data: any, ctx: ExecutionContext): string => getIPAndUserAgent(ctx.switchToHttp().getRequest())
);
