import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CaptchaModule } from '../captcha/captcha.module';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { PostModule } from '../post/post.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    CommonModule,
    OptionModule,
    AuthModule,
    forwardRef(() => PostModule),
    CaptchaModule
  ],
  controllers: [
    CommentController
  ],
  providers: [
    CommentService
  ],
  exports: [CommentService]
})
export class CommentModule {
}
