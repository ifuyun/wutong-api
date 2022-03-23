import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Message } from '../common/message.enum';
import { ResponseCode } from '../common/response-code.enum';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { CustomException } from '../exceptions/custom.exception';
import { format } from '../helpers/helper';

@Injectable()
export class CheckIdInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const idParams = this.reflector.get<{
      idInParams?: string[],
      idInQuery?: string[],
      idInBody?: string[]
    }>('idParams', context.getHandler());
    if (!idParams) {
      throw new CustomException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        data: {
          code: ResponseCode.INTERNAL_SERVER_ERROR,
          message: '无法获取ID参数列表，需要和@IdParams配合使用。'
        }
      });
    }
    const ids: string[] = [];
    idParams.idInParams && idParams.idInParams.forEach((key) => {
      // 路由参数不允许为空
      ids.push(req.params[key]);
    });
    idParams.idInQuery && idParams.idInQuery.forEach((key) => {
      // 查询参数允许为空，非空校验在action层面判断
      if (key && req.query[key]) {
        ids.push(req.query[key]);
      }
    });
    idParams.idInBody && idParams.idInBody.forEach((key) => {
      // 表单参数允许为空，非空校验在action层面判断
      let bodyIds = req.body[key] || '';
      if (typeof bodyIds === 'string') {
        bodyIds = bodyIds.trim();
        if (bodyIds) {
          ids.push(bodyIds);
        }
      } else if (Array.isArray(bodyIds)) {
        bodyIds.forEach((id) => {
          if (typeof id !== 'string') {
            throw new BadRequestException(<Message>format(Message.INVALID_PARAMS, id), HttpStatus.BAD_REQUEST, ResponseCode.ILLEGAL_PARAMS);
          }
          id = id.trim();
          if (id) {
            ids.push(id);
          }
        });
      } else {
        throw new BadRequestException(<Message>format(Message.INVALID_PARAMS, bodyIds), HttpStatus.BAD_REQUEST, ResponseCode.ILLEGAL_PARAMS);
      }
    });
    ids.forEach((id) => {
      if (!id || !/^[0-9a-fA-F]{16}$/i.test(id)) {
        throw new BadRequestException(<Message>format(Message.INVALID_PARAMS, id), HttpStatus.BAD_REQUEST, ResponseCode.ILLEGAL_PARAMS);
      }
    });
    return next.handle();
  }
}
