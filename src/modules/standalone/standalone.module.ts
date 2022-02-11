import { Module } from '@nestjs/common';
import { PostStandaloneController } from './post-standalone.controller';
import { CommentModule } from '../comment/comment.module';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { PostModule } from '../post/post.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    CommonModule,
    PostModule,
    CommentModule
  ],
  controllers: [PostStandaloneController],
  providers: []
})
export class StandaloneModule {
}
