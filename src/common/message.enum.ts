/**
 * messages support placeholder,
 * like:
 *     $0, $1, ..., and so on,
 * it will be replaced with the real value that is passed to the params.
 * Notice:
 *     placeholder starts with 0!
 */
export enum Message {
  // todo: internationalize
  NOT_FOUND = 'Page not found',
  UNKNOWN_ERROR = 'Unknown error',
  UNAUTHORIZED = 'Unauthorized',
  FORBIDDEN = 'Forbidden',
  BAD_REQUEST = 'Bad request',
  LOGIN_REJECT = '用户名或密码错误，请重新输入',
  UNSUPPORTED_OPERATION = 'Unsupported operation',
  ILLEGAL_PARAM = 'Unsupported parameter(s)',
  DB_QUERY_ERROR = '请求失败，请刷新页面重试',
  UNSUPPORTED_QUERY_ORDERS = '不支持的排序参数'
}
