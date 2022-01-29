export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  LOG = 'LOG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export enum LogCategory {
  accessLogger = 'access',
  sysLogger = 'system',
  dbLogger = 'db',
  uploadLogger = 'upload',
  threadLogger = 'thread'
}

export enum ResponseCode {
  // HTTP status
  HTTP_SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  PROXY_AUTHENTICATION_REQUIRED = 407,
  REQUEST_TIMEOUT = 408,
  TOO_MANY_REQUESTS = 429,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,

  // custom response code
  SUCCESS = 0,
  REQUEST_PARAM_ILLEGAL = 4001,
  UNKNOWN_ERROR = 5001,
  LOGIN_ERROR = 5002,
  SESSION_REGENERATE_ERROR = 5003,
  SESSION_DESTROY_ERROR = 5004,
  CAPTCHA_INPUT_ERROR = 5005,
  // post: 80xx
  POST_NOT_FOUND = 8000,
  POST_SAVE_ERROR = 8001,
  POST_COMMENT_CLOSED = 8002,
  // taxonomy: 81xx
  TAXONOMY_NOT_FOUND = 8100,
  TAXONOMY_INVISIBLE = 8101,
  TAXONOMY_QUERY_ERROR = 8102,
  TAXONOMY_SLUG_DUPLICATE = 8103,
  TAXONOMY_REMOVE_ERROR = 8104,
  // link: 82xx
  LINK_SAVE_ERROR = 8200,
  LINK_REMOVE_ERROR = 8201,
  // form: 83xx
  FORM_INPUT_ERROR = 8300,
  UPLOAD_ERROR = 8301,
  // book: 84xx
  BOOK_SAVE_ERROR = 8401,
  // other
  CAPTCHAR_GENERATE_ERROR = 8402,
  VOTE_FAILURE = 8403
}

export enum ResponseMessage {
  PAGE_NOT_FOUND = 'Page not found.',
  UNKNOWN_ERROR = 'Unknown error.'
}

export enum Roles {
  ROLE_ADMIN = 'admin'
}

export enum VoteType {
  LIKE = 'like',
  DISLIKE = 'dislike'
}
