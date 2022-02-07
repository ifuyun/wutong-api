import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import * as cluster from 'cluster';
import * as compress from 'compression';
import * as connectRedis from 'connect-redis';
import * as cookieParser from 'cookie-parser';
import * as csrf from 'csurf';
import * as ejs from 'ejs';
import * as session from 'express-session';
import * as log4js from 'log4js';
import { cpus } from 'os';
import { join } from 'path';
import { createClient } from 'redis';
import * as favicon from 'serve-favicon';
import { AppModule } from './app.module';
import AppConfig from './config/app.config';
import RedisConfig from './config/redis.config';
import LoggerService from './services/logger.service';
import { LogLevel } from './common/common.enum';
import { ValidationPipe } from '@nestjs/common';
import ExceptionFactory from './validators/exception-factory';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const loggerService = app.select(AppModule).get(LoggerService, { strict: true });
  const appConfig = AppConfig();
  const isCluster = appConfig.isCluster;
  const { accessLogger, threadLogger, sysLogger, transformLogData } = loggerService;
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
    const redisConfig = RedisConfig();

    // todo: 在logger之前设置static将无法记录静态文件访问日志
    app.useStaticAssets(join(__dirname, '..', 'web', 'public', 'static'));
    app.useStaticAssets(join(__dirname, '..', 'web', 'public', appConfig.isDev ? 'dev' : 'dist'));
    app.setBaseViewsDir(join(__dirname, '..', 'web', 'views', appConfig.viewsPath));
    /* if @types/ejs is installed, it'll be a error as it's read-only */
    ejs.delimiter = '?';
    app.setViewEngine('ejs');

    app.use((req, res, next) => {
      loggerService.updateContext();
      threadLogger.trace(transformLogData({
        message: `Request [${req.url}] is processed by ${isCluster ? 'Worker: ' + (cluster as any).worker.id : 'Master'}.`
      })[0]);
      next();
    });
    app.use(log4js.connectLogger(accessLogger, {
      level: LogLevel.INFO,
      format: ':remote-addr - :method :status HTTP/:http-version :url - [:response-time ms/:content-length B] ":referrer" ":user-agent"'
    }));

    app.use(compress());
    app.use(favicon(join(__dirname, '..', 'web', 'public', 'static', 'favicon.ico')));
    app.use(cookieParser(appConfig.cookieSecret));

    const redisClient = createClient(redisConfig.port, redisConfig.host, {'auth_pass': redisConfig.password});
    const RedisStore = connectRedis(session);
    app.use(session({
      name: 'jsid',
      store: new RedisStore({
        client: redisClient,
        ttl: 7 * 24 * 60 * 60
      }),
      secret: appConfig.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        // 默认domain：当前登录域ifuyun.com，设置后为.ifuyun.com
        maxAge: appConfig.cookieExpires // 默认7天
      }
    }));

    app.use(bodyParser.json({
      limit: '20mb'
    }));
    app.use(bodyParser.urlencoded({
      limit: '20mb',
      extended: true
    }));
    app.use(csrf({ cookie: true }));
    app.enable('trust proxy');
    app.use((req, res, next) => {
      res.setHeader('Server', appConfig.author + '/' + appConfig.version);
      res.setHeader('X-Powered-By', appConfig.domain);
      next();
    });
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      skipNullProperties: true,
      stopAtFirstError: true,
      exceptionFactory: ExceptionFactory
    }));

    await app.listen(appConfig.port, appConfig.host, () => sysLogger.info(transformLogData({
      message: `Server listening on: ${appConfig.host}:${appConfig.port}`
    })[0]));
  }
}

bootstrap();
