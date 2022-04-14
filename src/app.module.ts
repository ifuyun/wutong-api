import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import APP_CONFIG from './config/app.config';
import AUTH_CONFIG from './config/auth.config';
import ENV_CONFIG from './config/env.config';
import REDIS_CONFIG from './config/redis.config';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { ServeFileMiddleware } from './middlewares/serve-file.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { CaptchaModule } from './modules/captcha/captcha.module';
import { CommentModule } from './modules/comment/comment.module';
import { LinkModule } from './modules/link/link.module';
import { LoggerService } from './modules/logger/logger.service';
import { OptionModule } from './modules/option/option.module';
import { OptionService } from './modules/option/option.service';
import { PostModule } from './modules/post/post.module';
import { StatisticModule } from './modules/statistic/statistic.module';
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
    StatisticModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter
    },
    ConfigService,
    LoggerService
  ]
})
export class AppModule implements NestModule {
  constructor(private readonly optionService: OptionService) {
  }

  async configure(consumer: MiddlewareConsumer) {
    const uploadUrlPrefix = await this.optionService.getOptionByKey('upload_url_prefix');
    consumer
      .apply(ServeFileMiddleware)
      .forRoutes({ path: `${uploadUrlPrefix.optionValue}/*`, method: RequestMethod.GET });
  }
}
