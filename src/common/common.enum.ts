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

export enum Role {
  ADMIN = 'admin'
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

export enum PostStatus {
  PUBLISH = 'publish',
  PASSWORD = 'password',
  PRIVATE = 'private',
  // PENDING = 'pending',
  DRAFT = 'draft',
  AUTO_DRAFT = 'auto-draft',
  // INHERIT = 'inherit',
  TRASH = 'trash'
}

export enum PostStatusDesc {
  PUBLISH = '公开',
  PASSWORD = '加密',
  PRIVATE = '隐藏',
  // PENDING = '待定',
  DRAFT = '草稿',
  AUTO_DRAFT = '自动保存草稿',
  // INHERIT = '子文章',
  TRASH = '已删除'
}

export enum PostOriginal {
  YES = 1,
  NO = 0
}

export enum CommentFlag {
  OPEN = 'open',
  VERIFY = 'verify',
  CLOSE = 'close'
}

export enum CommentStatus {
  NORMAL = 'normal',
  PENDING = 'pending',
  REJECT = 'reject',
  SPAM = 'spam',
  TRASH = 'trash'
}

export enum CommentStatusDesc {
  NORMAL = '正常',
  PENDING = '待审',
  REJECT = '驳回',
  SPAM = '垃圾评论',
  TRASH = '已删除'
}

export enum TaxonomyType {
  POST = 'post',
  LINK = 'link',
  TAG = 'tag'
}

export enum TaxonomyStatus {
  PUBLISH = 'publish',
  PRIVATE = 'private',
  TRASH = 'trash'
}

export enum LinkVisible {
  SITE = 'site',
  HOMEPAGE = 'homepage',
  INVISIBLE = 'invisible'
}

export enum LinkVisibleDesc {
  SITE = '全站',
  HOMEPAGE = '首页',
  INVISIBLE = '不可见'
}

export enum LinkTarget {
  BLANK = '_blank',
  TOP = '_top',
  SELF = '_self'
}

export enum LinkTargetDesc {
  BLANK = '新页面',
  TOP = '父页面',
  SELF = '当前页'
}

export enum CopyrightType {
  FORBIDDEN = 0,
  AUTHORIZED = 1,
  CC = 2
}
