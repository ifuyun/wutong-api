import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomException } from '../exceptions/custom.exception';
import { CustomExceptionResponse } from '../interfaces/exception.interface';
import { HttpResponseEntity } from '../interfaces/http-response';
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
    const unknownErrorMsg = 'Unknown error.';

    if (exception instanceof CustomException) {
      const err = <CustomExceptionResponse> exception.getResponse();
      const errLog = err.log;
      const errStack = errLog && <string>errLog.stack || '';
      resStatus = exception.getStatus();
      resData = err.data;

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
        message: unknownErrorMsg
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

    if (isXhr) {
      // todo: only if isApiMode is closed
      // res.cookie(this.configService.get('app.cookieCsrfKey'), req.csrfToken(), {
      //   path: '/',
      //   domain: this.configService.get('app.cookieDomain'),
      //   maxAge: this.configService.get('app.cookieExpires')
      // });
      res.status(resStatus).json(resData);
    } else if(this.configService.get('env.isApiMode')) {
      res.status(resStatus).json(resData);
    } else {
      res.status(resStatus).type('text/html');
      res.render('errors/error', {...resData, status: resStatus});
    }
  }
}
