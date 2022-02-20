import { HttpStatus } from '@nestjs/common';
import { Message } from '../common/message.enum';
import { ResponseCode } from '../common/response-code.enum';
import { CustomException } from './custom.exception';

export class BadRequestException extends CustomException {
  constructor(
    message = Message.BAD_REQUEST,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    resCode: ResponseCode = ResponseCode.BAD_REQUEST
  ) {
    super(message, httpStatus, resCode);
  }
}
