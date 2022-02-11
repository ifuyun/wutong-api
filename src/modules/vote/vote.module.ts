import { Module } from '@nestjs/common';
import { VoteController } from './vote.controller';
import { VotesService } from './votes.service';
import { CommentModule } from '../comment/comment.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    CommentModule
  ],
  controllers: [VoteController],
  providers: [VotesService],
  exports: [VotesService]
})
export class VoteModule {
}
