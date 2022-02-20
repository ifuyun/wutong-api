import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { DbConfigService } from './db-config.service';
import { LoggerModule } from '../logger/logger.module';
import { LoggerService } from '../logger/logger.service';
import { BookModel } from '../../models/book.model';
import { CommentModel } from '../../models/comment.model';
import { CommentMetaModel } from '../../models/comment-meta.model';
import { LinkModel } from '../../models/link.model';
import { MaterialModel } from '../../models/material.model';
import { NoteModel } from '../../models/note.model';
import { OptionModel } from '../../models/option.model';
import { PostModel } from '../../models/post.model';
import { PostMetaModel } from '../../models/post-meta.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';
import { UserModel } from '../../models/user.model';
import { UserMetaModel } from '../../models/user-meta.model';
import { VoteModel } from '../../models/vote.model';
import { VPostDateArchiveModel } from '../../models/v-post-date-archive.model';
import { VPostViewAverageModel } from '../../models/v-post-view-average.model';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [LoggerModule],
      inject: [ConfigService, LoggerService],
      useClass: DbConfigService
    }),
    SequelizeModule.forFeature([
      BookModel,
      CommentModel,
      CommentMetaModel,
      LinkModel,
      MaterialModel,
      NoteModel,
      OptionModel,
      PostModel,
      PostMetaModel,
      TaxonomyModel,
      TaxonomyRelationshipModel,
      UserModel,
      UserMetaModel,
      VoteModel,
      VPostDateArchiveModel,
      VPostViewAverageModel
    ])
  ],
  exports: [SequelizeModule]
})
export class DatabaseModule {
}
