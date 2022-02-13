/**
 * Redis配置
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';
import { CREDENTIALS_CONFIG } from './credentials.config';
import { ENV_CONFIG } from './env.config';

export const REDIS_CONFIG = {
  host: '127.0.0.1',
  port: 6379,
  password: CREDENTIALS_CONFIG.redis[ENV_CONFIG.environment].password
};
export default registerAs('redis', () => REDIS_CONFIG);
