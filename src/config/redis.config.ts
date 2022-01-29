/**
 * Redis配置
 * @version 1.0.0
 * @since 1.0.0
 */
import CredentialsConfig from './credentials.config';
import AppConfig from './app.config';
import { registerAs } from '@nestjs/config';

const redisConfig = {
  host: '127.0.0.1',
  port: 6379,
  password: CredentialsConfig().redis[AppConfig().env].password
};
export default registerAs('redis', () => redisConfig);
