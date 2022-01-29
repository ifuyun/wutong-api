import { HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ResponseCode } from '../common/enums';
import CustomException from '../exceptions/custom.exception';

export default function ExceptionFactory(errors: ValidationError[]) {
  const messages: string[] = [];
  errors.forEach((error) => {
    Object.keys(error.constraints).forEach((key) => messages.push(error.constraints[key]));
  });
  throw new CustomException({
    data: {
      code: ResponseCode.BAD_REQUEST,
      status: HttpStatus.OK,
      message: messages[0]
    },
    log: {
      data: errors[0].target
    }
  });
}
