import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PostStandaloneController } from './post-standalone.controller';
import { CommentModule } from '../comment/comment.module';
import { UtilModule } from '../util/util.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { PostModule } from '../post/post.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    UtilModule,
    PostModule,
    CommentModule,
    AuthModule
  ],
  controllers: [PostStandaloneController],
  providers: []
})
export class StandaloneModule {
}
