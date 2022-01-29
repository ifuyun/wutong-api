import { HttpException, HttpStatus } from '@nestjs/common';
import { ResponseCode } from '../common/enums';
import { CustomExceptionResponseParam } from '../interfaces/exception.interface';

export default class CustomException extends HttpException {
  constructor(response: string | CustomExceptionResponseParam | number, httpStatus?: number, message?: string) {
    let res: CustomExceptionResponseParam;
    if (typeof response === 'string') {
      // 只有一个参数时，为message
      res = {
        data: {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ResponseCode.UNKNOWN_ERROR,
          message: response
        }
      };
    } else if(typeof response === 'number') {
      // 快捷方式，传参数列表，不带log信息
      res = {
        data: {
          status: httpStatus,
          code: response,
          message
        }
      };
    } else {
      // 参数为对象
      res = response;
    }
    super(res, res.data.status);
  }
}
