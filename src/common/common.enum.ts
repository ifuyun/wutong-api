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

export enum PostTypeDesc {
  POST = '文章',
  PAGE = '独立页面',
  REVISION = '修订稿',
  ATTACHMENT = '素材'
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
  PRIVATE = '私密',
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

export enum CommentFlagDesc {
  OPEN = '允许',
  VERIFY = '审核',
  CLOSE = '禁止'
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

export enum TaxonomyTypeDesc {
  POST = '文章分类',
  LINK = '链接分类',
  TAG = '标签'
}

export enum TaxonomyStatus {
  CLOSED = 0,
  OPEN = 1,
  TRASH = 2
}

export enum TaxonomyStatusDesc {
  CLOSED = '不公开',
  OPEN = '公开',
  TRASH = '已删除'
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

export enum CopyrightTypeDesc {
  FORBIDDEN = '禁止转载',
  AUTHORIZED = '转载需授权',
  CC = 'CC-BY-NC-ND'
}
