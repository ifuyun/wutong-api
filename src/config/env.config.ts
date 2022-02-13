import { registerAs } from '@nestjs/config';

const environment = (process.env.ENV && process.env.ENV.trim()) || 'development';
const isDev = environment === 'development';
const isProd = environment === 'production';
const envConfig = {
  environment,
  isDev,
  isProd
};
export default registerAs('env', () => envConfig);
