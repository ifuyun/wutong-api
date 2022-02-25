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
  PAGE_NOT_FOUND = 'Page not found',
  UNKNOWN_ERROR = 'Unknown error',
  UNAUTHORIZED = 'Unauthorized',
  BAD_REQUEST = 'Unauthorized',
  LOGIN_REJECT = '用户名或密码错误，请重新输入',
  UNSUPPORTED_OPERATION = 'Unsupported operation',
  ILLEGAL_PARAM = 'Unsupported parameter(s)'
}
