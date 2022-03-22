import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import APP_CONFIG from './config/app.config';
import AUTH_CONFIG from './config/auth.config';
import ENV_CONFIG from './config/env.config';
import REDIS_CONFIG from './config/redis.config';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { InitInterceptor } from './interceptors/init.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { CaptchaModule } from './modules/captcha/captcha.module';
import { CommentModule } from './modules/comment/comment.module';
import { LinkModule } from './modules/link/link.module';
import { LoggerService } from './modules/logger/logger.service';
import { OptionModule } from './modules/option/option.module';
import { PostModule } from './modules/post/post.module';
import { StandaloneModule } from './modules/standalone/standalone.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { UserModule } from './modules/user/user.module';
import { VoteModule } from './modules/vote/vote.module';
import { AsyncValidatorModule } from './validators/async/async-validator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `env/${process.env.ENV}.env`,
      // todo: validationSchema
      load: [ENV_CONFIG, REDIS_CONFIG, APP_CONFIG, AUTH_CONFIG]
    }),
    AsyncValidatorModule,
    AuthModule,
    PostModule,
    UserModule,
    CommentModule,
    VoteModule,
    TaxonomyModule,
    LinkModule,
    OptionModule,
    CaptchaModule,
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
    ConfigService,
    LoggerService
  ]
})
export class AppModule {
}
