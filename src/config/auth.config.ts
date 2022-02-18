/**
 * Auth(JwtModule)配置
 * @version 1.0.0
 * @since 1.0.0
 */
import { registerAs } from '@nestjs/config';

const AUTH_CONFIG = () => ({
  expiresIn: 24 * 60 * 60,
  secret: process.env.AUTH_SECRET
});

export default registerAs('auth', AUTH_CONFIG);
