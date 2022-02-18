import { HttpStatus } from '@nestjs/common';
import { Message } from '../common/message.enum';
import { ResponseCode } from '../common/response-code.enum';
import { CustomException } from './custom.exception';

export class UnauthorizedException extends CustomException {
  constructor(
    message = Message.UNAUTHORIZED,
    httpStatus: HttpStatus = HttpStatus.UNAUTHORIZED,
    resCode: ResponseCode = ResponseCode.UNAUTHORIZED
  ) {
    super(message, httpStatus, resCode);
  }
}
