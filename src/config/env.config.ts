/**
 * 返回环境信息
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';

const environment = (process.env.ENV && process.env.ENV.trim()) || 'development';
const ENV_CONFIG = () => ({
  environment,
  isDev: environment === 'development',
  isProd: environment === 'production',
  isCluster: process.env.IS_CLUSTER?.toLowerCase().trim() === 'true',
  isApiMode: true
});

export default registerAs('env', ENV_CONFIG);
