import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommentModule } from '../comment/comment.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { PostModule } from '../post/post.module';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    AuthModule,
    CommentModule,
    PostModule
  ],
  controllers: [VoteController],
  providers: [VoteService],
  exports: [VoteService]
})
export class VoteModule {
}
