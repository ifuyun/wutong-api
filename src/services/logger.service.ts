import { Injectable } from '@nestjs/common';
import { configure, getLogger, Logger } from 'log4js';
import * as moment from 'moment';
import { LogCategory } from '../common/common.enum';
import appConfig from '../config/app.config';
import { LogData } from '../interfaces/logger.interface';

@Injectable()
export default class LoggerService {
  accessLogger: Logger;
  sysLogger: Logger;
  dbLogger: Logger;
  uploadLogger: Logger;
  threadLogger: Logger;
  private logger: Logger;

  logDay: string = moment().format('YYYY-MM-DD');

  constructor() {
    let appenders = {};
    let categories = {
      default: {
        appenders: ['system'],
        level: appConfig().logLevel
      }
    };
    for (let label in LogCategory) {
      if (LogCategory.hasOwnProperty(label)) {
        const category = LogCategory[label];
        appenders[category] = {
          type: 'multiFile',
          base: 'logs/',
          extension: '.log',
          property: 'logDay',
          compress: false, // backup files will have .gz extension
          maxLogSize: 10485760, // 10MB
          backups: 10 // 默认5
        };
        categories[category] = {
          appenders: [category],
          level: appConfig().logLevel
        };
      }
    }
    configure({
      pm2: false,
      pm2InstanceVar: 'NEST_APP_INSTANCE',
      disableClustering: false,
      appenders,
      categories
    });

    for (let label in LogCategory) {
      if (LogCategory.hasOwnProperty(label)) {
        const category = LogCategory[label];
        this[label] = getLogger(category);
        this[label].addContext('logDay', category + '/' + this.logDay);
      }
    }
  }

  setLogger(logger: Logger) {
    this.logger = logger;
  }

  getLogger(): Logger {
    return this.logger;
  }

  updateContext() {
    const today = moment().format('YYYY-MM-DD');
    if (today !== this.logDay) {
      for (let label in LogCategory) {
        if (LogCategory.hasOwnProperty(label)) {
          this[label].addContext('logDay', LogCategory[label] + '/' + today);
        }
      }
    }
  }

  transformLogData(logData: string | LogData, ...args: any[]): Array<any> {
    if (args.length > 0) {
      return [logData, ...args];
    }
    let logStr: string = '';
    if (typeof logData === 'string') {
      logStr = `[Msg] ${logData}`;
    } else {
      logStr += logData.message ? `[Msg] ${logData.message}` : '';
      logStr += logData.data ? (logStr ? '\n' : '') + `[Data] ${JSON.stringify(logData.data)}` : '';
      logStr += logData.stack ? (logStr ? '\n' : '') + `[Stack] ${logData.stack}` : '';
      logStr += logData.ipAndAgent ? (logStr ? '\n' : '') + `[User] ${logData.ipAndAgent}` : '';
    }

    return [logStr];
  }

  trace(logData: string | LogData, ...args: any[]) {
    this.logger.trace.apply(null, this.transformLogData(logData, ...args));
  }

  debug(logData: string | LogData, ...args: any[]) {
    this.logger.debug.apply(null, this.transformLogData(logData, ...args));
  }

  info(logData: string | LogData, ...args: any[]) {
    this.logger.info.apply(null, this.transformLogData(logData, ...args));
  }

  warn(logData: string | LogData, ...args: any[]) {
    this.logger.warn.apply(null, this.transformLogData(logData, ...args));
  }

  error(logData: string | LogData, ...args: any[]) {
    this.logger.error.apply(null, this.transformLogData(logData, ...args));
  }

  fatal(logData: string | LogData, ...args: any[]) {
    this.logger.fatal.apply(null, this.transformLogData(logData, ...args));
  }

  mark(logData: string | LogData, ...args: any[]) {
    this.logger.mark.apply(null, this.transformLogData(logData, ...args));
  }
}
