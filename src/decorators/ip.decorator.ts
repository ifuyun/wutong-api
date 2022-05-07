import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getIP } from '../helpers/request-parser';

export const IP = createParamDecorator((data: any, ctx: ExecutionContext) => getIP(ctx.switchToHttp().getRequest()));
