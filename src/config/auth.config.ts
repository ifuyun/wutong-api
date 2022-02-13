/**
 * Auth(JwtModule)配置
 * @version 1.0.0
 * @since 1.0.0
 */
import { CREDENTIALS_CONFIG } from './credentials.config';
import { registerAs } from '@nestjs/config';

export const AUTH_CONFIG = {
  expiresIn: 24 * 60 * 60,
  secret: CREDENTIALS_CONFIG.authSecret
};
export default registerAs('auth', () => AUTH_CONFIG);
