import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpResponseEntity } from '../common/http-response.interface';
import { Message } from '../common/message.enum';
import { ResponseCode } from '../common/response-code.enum';
import { CustomException } from '../exceptions/custom.exception';
import { CustomExceptionResponse } from '../exceptions/exception.interface';
import { getIPAndUserAgent } from '../helpers/request-parser';
import { LoggerService } from '../modules/logger/logger.service';

@Catch()
export class AllExceptionsFilter<T> implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
    logger.setLogger(logger.sysLogger);
  }

  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const visitorInfo = getIPAndUserAgent(req);
    const isDev = this.configService.get('env.isDev');
    // 返回给终端的响应数据
    let resData: HttpResponseEntity;
    let resStatus: number;

    if (exception instanceof CustomException) {
      const errRes = <CustomExceptionResponse>exception.getResponse();
      const errLog = errRes.log;
      resStatus = exception.getStatus();
      resData = errRes.data;

      if (errLog) {
        if (isDev) {
          console.error(errLog);
        } else {
          this.logger.error({
            message: errLog.message || errRes.data.message,
            data: errLog.data || errRes.data.data,
            visitorInfo,
            stack: [ResponseCode.INTERNAL_SERVER_ERROR, ResponseCode.UNKNOWN_ERROR].includes(resData.code) &&
              exception.stack
          });
        }
      }
    } else if (exception instanceof HttpException) {
      const errRes = <string | Record<string, any>>exception.getResponse();
      const msg = typeof errRes === 'string' ? errRes : errRes.message || errRes.error || exception.message || Message.UNKNOWN_ERROR;
      resStatus = exception.getStatus();
      resData = {
        code: resStatus,
        message: msg
      };
      const stack = [HttpStatus.INTERNAL_SERVER_ERROR].includes(resStatus) && exception.stack;
      if (isDev) {
        console.error(stack);
      } else {
        this.logger.error({
          message: msg,
          visitorInfo,
          stack
        });
      }
    } else {
      resStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      resData = {
        code: resStatus,
        message: Message.UNKNOWN_ERROR
      };
      if (exception instanceof Error) {
        resData.message = exception.message;
        if (isDev) {
          console.error(exception.stack);
        } else {
          this.logger.error({
            visitorInfo,
            stack: exception.stack
          });
        }
      }
    }

    res.status(resStatus).json(resData);
  }
}
