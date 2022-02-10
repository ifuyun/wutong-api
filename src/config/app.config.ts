/**
 * 基本配置信息
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';
import CredentialsConfig from './credentials.config';

const credentials = CredentialsConfig();
const env = (process.env.ENV && process.env.ENV.trim()) || 'development';
const isDev = env !== 'production';
const appConfig = {
  siteName: '爱浮云',
  version: '4.0.0',
  author: 'Fuyun',
  sessionKey: 'sid',
  sessionSecret: credentials.sessionSecret,
  cookieSecret: credentials.cookieSecret,
  cookieExpires: 1000 * 60 * 60 * 24 * 7,
  cookieDomain: isDev ? 'localhost' : 'ifuyun.com',
  host: '127.0.0.1',
  port: 2016,
  domain: 'www.ifuyun.com',
  viewsPath: isDev ? 'src' : 'dist',
  logLevel: isDev ? 'TRACE' : 'INFO',
  env,
  isDev,
  isCluster: false,
  enableWxSdk: false
};
export default registerAs('app', () => appConfig);
