/**
 * 基本配置信息
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';
import { CREDENTIALS_CONFIG } from './credentials.config';
import { ENV_CONFIG } from './env.config';


export const APP_CONFIG = {
  // todo: to be removed & replaced with db-options
  siteName: '爱浮云',
  sessionKey: 'sid',
  sessionSecret: CREDENTIALS_CONFIG.sessionSecret,
  cookieSecret: CREDENTIALS_CONFIG.cookieSecret,
  cookieExpires: 1000 * 60 * 60 * 24 * 7,
  cookieDomain: ENV_CONFIG.isDev ? 'localhost' : 'ifuyun.com',
  host: '127.0.0.1',
  port: 2016,
  domain: 'www.ifuyun.com',
  viewsPath: ENV_CONFIG.isDev ? 'src' : 'dist',
  logLevel: ENV_CONFIG.isDev ? 'TRACE' : 'INFO',
  isCluster: ENV_CONFIG.isProd,
  enableWxSdk: false
};
export default registerAs('app', () => APP_CONFIG);
