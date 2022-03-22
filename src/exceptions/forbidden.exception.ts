import { HttpStatus } from '@nestjs/common';
import { Message } from '../common/message.enum';
import { ResponseCode } from '../common/response-code.enum';
import { CustomException } from './custom.exception';

export class ForbiddenException extends CustomException {
  constructor(
    message = Message.FORBIDDEN,
    httpStatus: HttpStatus = HttpStatus.FORBIDDEN,
    resCode: ResponseCode = ResponseCode.FORBIDDEN
  ) {
    super(message, httpStatus, resCode);
  }
}
