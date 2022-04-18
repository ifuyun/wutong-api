export const ID_REG = /^[0-9a-fA-F]{16}$/i;
export const ALLOWED_ORIGINS = Object.freeze([/\.ifuyun\.com$/, /\/\/ifuyun\.com$/]);
/* 定义独立页面slug前缀黑名单，除了post外，已定义路由全部禁止，用于校验 */
export const POST_SLUG_PREFIX_BLACKLIST = Object.freeze([
  'category', 'tag', 'archive', 'comment', 'user', 'admin', 'api'
]);

export const POST_TITLE_LENGTH = 100;
export const POST_EXCERPT_LENGTH = 140;
export const POST_TAXONOMY_LIMIT = 5;
export const POST_TAG_LIMIT = 15;
export const POST_SOURCE_LENGTH = 100;
export const POST_AUTHOR_LENGTH = 50;
export const POST_PASSWORD_LENGTH = 20;

export const COMMENT_LENGTH = 800;

export const TAXONOMY_NAME_LENGTH = 20;
export const TAXONOMY_SLUG_LENGTH = 50;
export const TAXONOMY_DESCRIPTION_LENGTH = 40;

export const LINK_NAME_LENGTH = 20;
export const LINK_URL_LENGTH = 100;
export const LINK_DESCRIPTION_LENGTH = 40;

export const SITE_TITLE_LENGTH = 20;
export const SITE_DESCRIPTION_LENGTH = 400;
export const SITE_SLOGAN_LENGTH = 100;
export const SITE_URL_LENGTH = 100;
export const SITE_KEYWORDS_LENGTH = 200;
export const SITE_KEYWORDS_SIZE = 20;
export const SITE_ADMIN_EMAIL_LENGTH = 100;
export const SITE_ICP_NUM_LENGTH = 50;
export const SITE_COPYRIGHT_LENGTH = 100;
export const UPLOAD_PATH_LENGTH = 200;
export const STATIC_RESOURCE_HOST_LENGTH = 100;
export const UPLOAD_URL_PREFIX_LENGTH = 20;
export const WATERMARK_FONT_PATH_LENGTH = 200;
