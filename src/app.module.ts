import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import HomeModule from './home.module';
import AdminModule from './admin/admin.module';
import StandaloneModule from './modules/standalone/standalone.module';
import appConfig from './config/app.config';
import credentialsConfig from './config/credentials.config';
import redisConfig from './config/redis.config';
import AllExceptionsFilter from './filters/all-exceptions.filter';
import InitInterceptor from './interceptors/init.interceptor';
import LoggerService from './services/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, credentialsConfig, redisConfig]
    }),
    HomeModule,
    AdminModule,
    StandaloneModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: InitInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter
    },
    LoggerService
  ]
})
export class AppModule {
}
