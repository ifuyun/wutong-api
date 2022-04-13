import { HttpResponseEntity } from '../common/http-response.interface';
import { HttpStatus } from '@nestjs/common';

export interface CustomExceptionLog {
  msg?: string;
  stack?: any;
  data?: any;
}

export interface CustomExceptionResponse {
  status?: HttpStatus;
  data: HttpResponseEntity,
  log?: CustomExceptionLog
}
