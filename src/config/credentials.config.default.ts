/**
 * 安全信息配置
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';

export const CREDENTIALS_CONFIG = {
  sessionSecret: '[session-secret]',
  cookieSecret: '[cookie-secret]',
  wxMpAppID: '[wechat-mp-app-id]',
  wxMpAppSecret: '[wechat-mp-app-secret]',
  authSecret: '[auth-secret-for-jwt-token]',
  redis: {
    development: {
      password: '[redis-dev-pwd]'
    },
    production: {
      password: '[redis-prd-pwd]'
    }
  },
  db: {
    development: {
      username: '[db-dev-user]',
      password: '[db-dev-pwd]'
    },
    production: {
      username: '[db-prd-user]',
      password: '[db-prd-pwd]'
    }
  },
  watermark: {
    fontPath: '[/path/to/font-file]'
  }
};
export default registerAs('credentials', () => CREDENTIALS_CONFIG);
