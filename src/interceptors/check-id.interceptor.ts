import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ResponseCode } from '../common/enums';
import CustomException from '../exceptions/custom.exception';

@Injectable()
export default class CheckIdInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const idParams = this.reflector.get<string[][]>('idParams', context.getHandler());
    if (!idParams) {
      throw new CustomException({
        data: {
          code: ResponseCode.INTERNAL_SERVER_ERROR,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '无法获取ID参数列表，需要和@IdParams配合使用。'
        }
      });
    }
    const ids: string[] = [];
    idParams[0].forEach((key) => {
      // 路由参数不允许为空
      ids.push(req.params[key]);
    });
    idParams[1].forEach((key) => {
      // 查询参数允许为空，非空校验在action层面判断
      if (key && req.query[key]) {
        ids.push(req.query[key]);
      }
    });
    ids.forEach((id) => {
      if (!id || !/^[0-9a-fA-F]{16}$/i.test(id)) {
        throw new CustomException({
          data: {
            code: ResponseCode.REQUEST_PARAM_ILLEGAL,
            message: `Request param: ${id} is invalid.`,
            status: HttpStatus.BAD_REQUEST
          }
        });
      }
    });
    return next.handle();
  }
}
