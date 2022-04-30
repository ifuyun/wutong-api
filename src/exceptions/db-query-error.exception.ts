import { HttpStatus } from '@nestjs/common';
import { Message } from '../common/message.enum';
import { ResponseCode } from '../common/response-code.enum';
import { CustomExceptionResponse } from './exception.interface';
import { CustomException } from './custom.exception';

export class DbQueryErrorException extends CustomException {
  constructor(
    message: Message | CustomExceptionResponse = Message.DB_QUERY_ERROR,
    resCode: ResponseCode = ResponseCode.DB_QUERY_ERROR,
    httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR
  ) {
    super(message, httpStatus, resCode);
  }
}
