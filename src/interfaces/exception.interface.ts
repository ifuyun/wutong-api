export interface CustomExceptionResponse {
  status: number;
  code: number;
  message: string;
  data?: any;
}

export interface CustomExceptionLog {
  msg?: string;
  stack?: unknown;
  data?: any;
}

export interface CustomExceptionResponseParam {
  data: CustomExceptionResponse,
  log?: CustomExceptionLog
}
