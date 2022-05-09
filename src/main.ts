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
import * as ejs from 'ejs';
import { Request, Response } from 'express';
import * as session from 'express-session';
import helmet from 'helmet';
import * as log4js from 'log4js';
import { cpus } from 'os';
import { createClient } from 'redis';
import { AppModule } from './app.module';
import { LogLevel } from './common/common.enum';
import { getIP } from './helpers/request-parser';
import { LoggerService } from './modules/logger/logger.service';
import { ExceptionFactory } from './validators/exception-factory';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = app.select(AppModule).get(LoggerService, { strict: true });
  const config = app.select(AppModule).get(ConfigService, { strict: true });
  const isCluster = config.get('env.isCluster');
  const { accessLogger, sysLogger, transformLogData } = logger;
  /* cluster模式必须在app实例化之后，否则将缺少master进程，导致log4js报错，因此无法通过ClusterService.clusterize方式调用 */
  if ((cluster as any).isPrimary && isCluster) {
    const workerSize = Math.max(cpus().length, 2);
    for (let cpuIdx = 0; cpuIdx < workerSize; cpuIdx += 1) {
      (cluster as any).fork();
    }

    (cluster as any).on('exit', (worker, code, signal) => {
      sysLogger.error(transformLogData({
        message: `Worker ${worker.process.pid} exit.`,
        data: {
          code,
          signal
        }
      })[0]);
      process.nextTick(() => {
        sysLogger.info(transformLogData({
          message: 'New process is forking...'
        })[0]);
        (cluster as any).fork();
      });
    });
  } else {
    /* if @types/ejs is installed, it'll be an error as it's read-only */
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
    app.use(helmet());
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      skipNullProperties: true,
      stopAtFirstError: true,
      exceptionFactory: ExceptionFactory
    }));
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    app.use((req: Request, res: Response, next: Function) => {
      logger.updateContext();
      next();
    });
    app.use(log4js.connectLogger(accessLogger, {
      level: LogLevel.INFO,
      format: (req, res, format) => {
        if (config.get('env.serverIP') === getIP(req)) { // exclude SSR requests
          return '';
        }
        return format(':remote-addr - :method :status HTTP/:http-version :url - ' +
          '[:response-time ms/:content-length B] ":referrer" ":user-agent"');
      }
    }));

    await app.listen(config.get('app.port'), config.get('app.host'), () => sysLogger.info(transformLogData({
      message: `Server listening on: ${config.get('app.host')}:${config.get('app.port')}`
    })[0]));
  }
}

bootstrap();
