import { ResponseCode } from '../common/response-code.enum';

export interface HttpResponseEntity {
  code: ResponseCode;
  message?: string;
  data?: any;
}
