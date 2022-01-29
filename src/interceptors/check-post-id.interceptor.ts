import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import CustomException from '../exceptions/custom.exception';
import { ResponseCode } from '../common/enums';

@Injectable()
export default class CheckPostIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const postId = req.params.postId;
    if (!postId || !/^[0-9a-fA-F]{16}$/i.test(postId)) {
      throw new CustomException({
        data: {
          code: ResponseCode.REQUEST_PARAM_ILLEGAL,
          message: `Request param: ${postId} is invalid.`,
          status: HttpStatus.BAD_REQUEST
        }
      });
    }
    return next.handle();
  }
}
