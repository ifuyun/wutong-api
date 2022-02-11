import { forwardRef, Module } from '@nestjs/common';
import { AdminCommentController } from './admin-comment.controller';
import { CommentController } from './comment.controller';
import { CommentsService } from './comments.service';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { OptionModule } from '../option/option.module';
import { PaginatorModule } from '../paginator/paginator.module';
import { PostModule } from '../post/post.module';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    PaginatorModule,
    forwardRef(() => PostModule),
    OptionModule
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
