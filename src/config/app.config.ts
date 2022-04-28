/**
 * 基本配置信息
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';

const APP_CONFIG = () => ({
  sessionKey: 'sid',
  sessionSecret: process.env.SESSION_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
  cookieExpires: 1000 * 60 * 60 * 24 * 7,
  cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
  host: process.env.HOST || 'localhost',
  port: parseInt(process.env.PORT || '', 10) || 2016,
  logLevel: process.env.LOG_LEVEL || 'TRACE',
  enableWxSdk: false
});

export default registerAs('app', APP_CONFIG);
