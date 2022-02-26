import { forwardRef, Module } from '@nestjs/common';
import { CaptchaModule } from '../captcha/captcha.module';
import { DatabaseModule } from '../database/database.module';
import { OptionModule } from '../option/option.module';
import { PaginatorModule } from '../paginator/paginator.module';
import { PostModule } from '../post/post.module';
import { UtilModule } from '../util/util.module';
import { AdminCommentController } from './admin-comment.controller';
import { CommentController } from './comment.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    DatabaseModule,
    UtilModule,
    PaginatorModule,
    forwardRef(() => PostModule),
    OptionModule,
    CaptchaModule
  ],
  controllers: [
    CommentController,
    AdminCommentController
  ],
  providers: [CommentsService],
  exports: [CommentsService]
})
export class CommentModule {
}
