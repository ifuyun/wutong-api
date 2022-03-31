import { HttpStatus } from '@nestjs/common';
import { Message } from '../common/message.enum';
import { ResponseCode } from '../common/response-code.enum';
import { CustomExceptionResponse } from '../interfaces/exception.interface';
import { CustomException } from './custom.exception';

export class ForbiddenException extends CustomException {
  constructor(
    message: string | CustomExceptionResponse = Message.FORBIDDEN,
    resCode: ResponseCode = ResponseCode.FORBIDDEN,
    httpStatus: HttpStatus = HttpStatus.FORBIDDEN
  ) {
    super(message, httpStatus, resCode);
  }
}
