/* 定义独立页面slug前缀黑名单，除了post外，已定义路由全部禁止，用于校验 */
export enum PostSlugPrefixBlacklist {
  CATEGORY = '/category/',
  TAG = '/tag/',
  ARCHIVE = '/archive/',
  COMMENT = '/comment/',
  VOTE = '/vote/',
  CAPTCHA = '/captcha/',
  USER = '/user/',
  ADMIN = '/admin/',
  WECHAT = '/wechat/',
  API = '/api/'
}

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
  LOGIN_ERROR,
  SESSION_REGENERATE_ERROR,
  SESSION_DESTROY_ERROR,
  CAPTCHA_INPUT_ERROR,
  // post: 80xx
  POST_NOT_FOUND = 8000,
  POST_SAVE_ERROR,
  POST_COMMENT_CLOSED,
  POST_TYPE_INVALID,
  // taxonomy: 81xx
  TAXONOMY_NOT_FOUND = 8100,
  TAXONOMY_INVISIBLE,
  TAXONOMY_QUERY_ERROR,
  TAXONOMY_SLUG_DUPLICATE,
  TAXONOMY_REMOVE_ERROR,
  // link: 82xx
  LINK_SAVE_ERROR = 8200,
  LINK_REMOVE_ERROR = 8201,
  // form: 83xx
  FORM_INPUT_ERROR = 8300,
  UPLOAD_ERROR,
  // book: 84xx
  BOOK_SAVE_ERROR = 8401,
  // user: 85xx
  USER_NOT_FOUND,
  // other
  CAPTCHAR_GENERATE_ERROR = 8902,
  VOTE_FAILURE
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

export enum PostType {
  POST = 'post',
  PAGE = 'page',
  REVISION = 'revision',
  ATTACHMENT = 'attachment'
}

export enum PostTypeLang {
  POST = '文章',
  PAGE = '独立页面',
  REVISION = '修订稿',
  ATTACHMENT = '素材'
}

export enum PostStatus {
  PUBLISH = 'publish',
  PRIVATE = 'private',
  // PENDING = 'pending',
  DRAFT = 'draft',
  AUTO_DRAFT = 'auto-draft',
  // INHERIT = 'inherit',
  TRASH = 'trash'
}

export enum PostStatusLang {
  PUBLISH = '公开',
  PRIVATE = '私密',
  // PENDING = '待定',
  DRAFT = '草稿',
  AUTO_DRAFT = '自动保存草稿',
  // INHERIT = '子文章',
  TRASH = '已删除'
}
