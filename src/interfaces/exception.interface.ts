import { HttpResponseEntity } from './http-response';
import { HttpStatus } from '@nestjs/common';

export interface CustomExceptionLog {
  msg?: string;
  stack?: unknown;
  data?: any;
}

export interface CustomExceptionResponse {
  status?: HttpStatus;
  data: HttpResponseEntity,
  log?: CustomExceptionLog
}
