import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommentModule } from '../comment/comment.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { PostModule } from '../post/post.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { StatisticController } from './statistic.controller';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    AuthModule,
    PostModule,
    TaxonomyModule,
    CommentModule
  ],
  controllers: [StatisticController]
})
export class StatisticModule {}
