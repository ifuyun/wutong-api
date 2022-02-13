/**
 * 基本配置信息
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';
import CredentialsConfig from './credentials.config';
import EnvConfig from './env.config';

const credentials = CredentialsConfig();
const envConfig = EnvConfig();
const appConfig = {
  // todo: to be removed & replaced with db-options
  siteName: '爱浮云',
  sessionKey: 'sid',
  sessionSecret: credentials.sessionSecret,
  cookieSecret: credentials.cookieSecret,
  cookieExpires: 1000 * 60 * 60 * 24 * 7,
  cookieDomain: envConfig.isDev ? 'localhost' : 'ifuyun.com',
  host: '127.0.0.1',
  port: 2016,
  domain: 'www.ifuyun.com',
  viewsPath: envConfig.isDev ? 'src' : 'dist',
  logLevel: envConfig.isDev ? 'TRACE' : 'INFO',
  isCluster: envConfig.isProd,
  enableWxSdk: false
};
export default registerAs('app', () => appConfig);
