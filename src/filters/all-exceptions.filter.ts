import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from '../common/message.enum';
import { CustomException } from '../exceptions/custom.exception';
import { CustomExceptionResponse } from '../exceptions/exception.interface';
import { HttpResponseEntity } from '../common/http-response.interface';
import { LoggerService } from '../modules/logger/logger.service';
import { ResponseCode } from '../common/response-code.enum';

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
    const isXhr = req.xhr;
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
            message: errLog.msg || errRes.data.message,
            data: errLog.data || errRes.data.data || '',
            stack: errLog.stack || ''
          });
        }
      }
    } else if (exception instanceof HttpException) {
      const errRes = <string | Record<string, any>>exception.getResponse();
      const msg = typeof errRes === 'string' ? errRes : errRes.message || errRes.error || exception.message || Message.UNKNOWN_ERROR;
      resStatus = exception.getStatus();
      resData = {
        code: exception.getStatus(),
        message: msg
      };
      if (isDev) {
        console.error(exception.stack);
      } else {
        this.logger.error({
          message: msg,
          stack: exception.stack
        });
      }
    } else {
      resStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      resData = {
        code: ResponseCode.INTERNAL_SERVER_ERROR,
        message: Message.UNKNOWN_ERROR
      };
      if (exception instanceof Error) {
        resData.message = exception.message;
        if (isDev) {
          console.error(exception.stack);
        } else {
          this.logger.error({
            stack: exception.stack
          });
        }
      }
    }

    res.status(resStatus).json(resData);
  }
}
