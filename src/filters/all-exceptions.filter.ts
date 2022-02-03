import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CustomException from '../exceptions/custom.exception';
import { CustomExceptionResponse, CustomExceptionResponseParam } from '../interfaces/exception.interface';
import LoggerService from '../services/logger.service';

@Catch()
export default class AllExceptionsFilter<T> implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const isXhr = req.xhr;
    const isDev = this.configService.get('app.isDev');
    // 返回给终端的响应数据
    let errData: CustomExceptionResponse;
    const unknownErrorMsg = 'Unknown error.';

    if (exception instanceof CustomException) {
      const err = (<CustomExceptionResponseParam> exception.getResponse());
      const errLog = err.log;
      const errStack = errLog && <string>errLog.stack || '';
      errData = err.data;

      if (isDev) {
        if (errLog) {
          console.error(errLog);
        }
      } else {
        this.logger.error({
          message: errLog && errLog.msg || err.data.message,
          data: errLog && errLog.data || err.data.data || '',
          stack: errStack
        });
      }
    } else if (exception instanceof HttpException) {
      const errRes = <string | Record<string, any>> exception.getResponse();
      const msg = typeof errRes === 'string' ? errRes : errRes.message || errRes.error || exception.message || unknownErrorMsg;
      errData = {
        code: exception.getStatus(),
        status: exception.getStatus(),
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
      errData = {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: unknownErrorMsg
      };
      if (exception instanceof Error) {
        errData.message = exception.message;
        if (isDev) {
          console.error(exception.stack);
        } else {
          this.logger.error({
            stack: exception.stack
          });
        }
      }
    }

    if (isXhr) {
      res.status(errData.status).json({ ...errData, token: req.csrfToken() });
    } else {
      res.status(errData.status).type('text/html');
      res.render('errors/error', errData);
    }
  }
}
