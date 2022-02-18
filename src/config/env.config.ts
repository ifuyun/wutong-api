/**
 * 返回环境信息
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';

const environment = (process.env.ENV && process.env.ENV.trim()) || 'development';
const isDev = environment === 'development';
const isProd = environment === 'production';

// todo: move to environments config file
export const ENV_CONFIG = {
  environment,
  isDev,
  isProd,
  isCluster: isProd,
  isApiMode: true
};
export default registerAs('env', () => ENV_CONFIG);
