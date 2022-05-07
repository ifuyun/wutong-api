import { HttpResponseEntity } from '../common/http-response.interface';
import { HttpStatus } from '@nestjs/common';

export interface CustomExceptionLog {
  message?: string;
  data?: any;
}

export interface CustomExceptionResponse {
  status?: HttpStatus;
  data: HttpResponseEntity,
  log?: CustomExceptionLog
}
