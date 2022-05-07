/**
 * 数据库配置
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModuleOptions, SequelizeOptionsFactory } from '@nestjs/sequelize';
import { LoggerService } from '../logger/logger.service';

/**
 * Can't return config directly, it must be defined as a Class,
 * otherwise, LoggerService will be undefined.
 */
@Injectable()
export class DbConfigService implements SequelizeOptionsFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
  }

  private dbConfig: SequelizeModuleOptions = {
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: '+08:00',
    pool: {
      max: 10,
      min: 0,
      idle: 30000
    },
    synchronize: false,
    autoLoadModels: true
  };

  createSequelizeOptions(): SequelizeModuleOptions {
    if (this.configService.get('env.isDev')) {
      this.dbConfig.logging = (sql, timing) => {
        this.logger.dbLogger.trace(timing, sql);
      };
    } else {
      this.dbConfig.logging = false;
    }
    return this.dbConfig;
  }
}
