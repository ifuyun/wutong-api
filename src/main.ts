import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { useContainer } from 'class-validator';
import * as cluster from 'cluster';
import * as compress from 'compression';
import * as connectRedis from 'connect-redis';
import * as cookieParser from 'cookie-parser';
import * as csrf from 'csurf';
import * as ejs from 'ejs';
import * as session from 'express-session';
import helmet from 'helmet';
import * as log4js from 'log4js';
import { cpus } from 'os';
import { join } from 'path';
import { createClient } from 'redis';
import * as favicon from 'serve-favicon';
import { AppModule } from './app.module';
import { LogLevel } from './common/common.enum';
import { LoggerService } from './modules/logger/logger.service';
import { ExceptionFactory } from './validators/exception-factory';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = app.select(AppModule).get(LoggerService, { strict: true });
  const config = app.select(AppModule).get(ConfigService, { strict: true });
  const isCluster = config.get('env.isCluster');
  const { accessLogger, threadLogger, sysLogger, transformLogData } = logger;
  /* cluster模式必须在app实例化之后，否则将缺少master进程，导致log4js报错，因此无法通过ClusterService.clusterize方式调用 */
  if ((cluster as any).isPrimary && isCluster) {
    const workerSize = Math.max(cpus().length, 2);
    for (let cpuIdx = 0; cpuIdx < workerSize; cpuIdx += 1) {
      (cluster as any).fork();
    }

    (cluster as any).on('exit', (worker, code, signal) => {
      threadLogger.warn(transformLogData({
        message: `Worker ${worker.process.pid} exit.`,
        data: {
          code,
          signal
        }
      })[0]);
      process.nextTick(() => {
        threadLogger.info(transformLogData({
          message: 'New process is forking...'
        })[0]);
        (cluster as any).fork();
      });
    });
  } else {
    /* if @types/ejs is installed, it'll be a error as it's read-only */
    ejs.delimiter = '?';
    app.setViewEngine('ejs');
    app.use(compress());
    app.use(cookieParser(config.get('app.cookieSecret')));

    const redisClient = createClient({
      url: `redis://:${config.get('redis.password')}@${config.get('redis.host')}:${config.get('redis.port')}`,
      legacyMode: true
    });
    await redisClient.connect().catch((err) => sysLogger.info(transformLogData({
      message: `Redis Client Error: ${err.message}`
    })));
    const RedisStore = connectRedis(session);
    app.use(session({
      name: config.get('app.sessionKey'),
      store: new RedisStore({
        client: redisClient,
        ttl: 7 * 24 * 60 * 60
      }),
      secret: config.get('app.sessionSecret'),
      resave: false,
      saveUninitialized: false,
      cookie: { // 默认domain：当前登录域ifuyun.com，设置后为.ifuyun.com
        maxAge: config.get('app.cookieExpires') // 默认7天
      }
    }));

    app.use(bodyParser.json({ limit: '2mb' }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.enable('trust proxy');
    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      skipNullProperties: true,
      stopAtFirstError: true,
      exceptionFactory: ExceptionFactory
    }));
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    if (!config.get('env.isApiMode')) {
      /* API服务在应用层做CSRF控制 */
      app.use(csrf({ cookie: { key: config.get('app.cookieCsrfKey') } }));
      /* API服务不需要静态资源 */
      app.use(favicon(join(__dirname, '..', 'web', 'public', 'static', 'favicon.ico')));
      app.useStaticAssets(join(__dirname, '..', 'web', 'public', 'static'));
      app.useStaticAssets(join(__dirname, '..', 'web', 'public', config.get('env.isDev') ? 'dev' : 'dist'));
      app.setBaseViewsDir(join(__dirname, '..', 'web', 'views', config.get('app.viewsPath')));
    }

    app.use((req, res, next) => {
      logger.updateContext();
      threadLogger.trace(transformLogData({
        message: `Request [${req.url}] is processed by ${isCluster ? 'Worker: ' + (cluster as any).worker.id : 'Master'}.`
      })[0]);
      next();
    });
    app.use(log4js.connectLogger(accessLogger, {
      level: LogLevel.INFO,
      format: ':remote-addr - :method :status HTTP/:http-version :url - [:response-time ms/:content-length B] ":referrer" ":user-agent"'
    }));

    await app.listen(config.get('app.port'), config.get('app.host'), () => sysLogger.info(transformLogData({
      message: `Server listening on: ${config.get('app.host')}:${config.get('app.port')}`
    })[0]));
  }
}

bootstrap();
