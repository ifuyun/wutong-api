/**
 * Redis配置
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';

const REDIS_CONFIG = () => ({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

export default registerAs('redis', REDIS_CONFIG);
