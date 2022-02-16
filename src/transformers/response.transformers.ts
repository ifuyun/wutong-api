import { ResponseCode } from '../common/response-code.enum';
import { HttpResponseEntity } from '../interfaces/http-response';

export function getSuccessResponse<T>(data: T, message?: string): HttpResponseEntity {
  const resData: HttpResponseEntity = {
    code: ResponseCode.SUCCESS,
    data
  };
  if (message) {
    resData.message = message;
  }
  return resData;
}
