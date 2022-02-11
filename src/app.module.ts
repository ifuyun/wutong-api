import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StandaloneModule } from './modules/standalone/standalone.module';
import appConfig from './config/app.config';
import credentialsConfig from './config/credentials.config';
import redisConfig from './config/redis.config';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { InitInterceptor } from './interceptors/init.interceptor';
import { PostModule } from './modules/post/post.module';
import { LinkModule } from './modules/link/link.module';
import { CommentModule } from './modules/comment/comment.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { OptionModule } from './modules/option/option.module';
import { LoggerService } from './modules/logger/logger.service';
import { UserModule } from './modules/user/user.module';
import { VoteModule } from './modules/vote/vote.module';
import { AsyncValidatorModule } from './validators/async/async-validator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, credentialsConfig, redisConfig]
    }),
    AsyncValidatorModule,
    PostModule,
    CommentModule,
    VoteModule,
    UserModule,
    DashboardModule,
    TaxonomyModule,
    LinkModule,
    OptionModule,
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
    LoggerService,
  ]
})
export class AppModule {
}
