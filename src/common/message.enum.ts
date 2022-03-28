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
  UNKNOWN_ERROR = 'Operation fail',
  UNAUTHORIZED = 'Unauthorized',
  FORBIDDEN = 'Forbidden',
  BAD_REQUEST = 'Bad request',
  INTERNAL_SERVER_ERROR = 'Operation fail',
  LOGIN_REJECT = '用户名或密码错误，请重新输入',
  UNSUPPORTED_OPERATION = 'Unsupported operation',
  ILLEGAL_PARAM = 'Unsupported parameter(s)',
  DB_QUERY_FAIL = '请求失败，请稍后重试',
  UNSUPPORTED_QUERY_ORDERS = '不支持的排序参数',
  INVALID_PARAMS = '参数: $0 无效',
  COMMENT_SAVE_ERROR = '评论保存失败',
  TAXONOMY_NOT_FOUND = 'Taxonomy not exist',
  MISSED_PARAMS = '缺少参数',
  POST_GUID_EXIST = 'URL已存在，请重新输入',
  POST_SAVE_ERROR = '文章保存失败'
}
