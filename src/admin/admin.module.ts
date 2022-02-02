import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { AdminCommentController } from './controllers/admin-comment.controller';
import AdminTaxonomyController from './controllers/admin-taxonomy.controller';
import appConfig from '../config/app.config';
import credentialsConfig from '../config/credentials.config';
import redisConfig from '../config/redis.config';
import AdminController from './controllers/admin.controller';
import AdminPostController from './controllers/admin-post.controller';
import BookModel from '../models/book.model';
import CommentModel from '../models/comment.model';
import CommentMetaModel from '../models/comment-meta.model';
import LinkModel from '../models/link.model';
import MaterialModel from '../models/material.model';
import NoteModel from '../models/note.model';
import OptionModel from '../models/option.model';
import PostModel from '../models/post.model';
import PostMetaModel from '../models/post-meta.model';
import TaxonomyModel from '../models/taxonomy.model';
import TaxonomyRelationshipModel from '../models/taxonomy-relationship.model';
import UserModel from '../models/user.model';
import UserMetaModel from '../models/user-meta.model';
import VPostDateArchiveModel from '../models/v-post-date-archive.model';
import VPostViewAverageModel from '../models/v-post-view-average.model';
import VoteModel from '../models/vote.model';
import LoggerModule from '../modules/logger.module';
import AppService from '../services/app.service';
import CommentsService from '../services/comments.service';
import CommonService from '../services/common.service';
import CrumbService from '../services/crumb.service';
import DbConfigService from '../services/db-config.service';
import LinksService from '../services/links.service';
import LoggerService from '../services/logger.service';
import OptionsService from '../services/options.service';
import PaginatorService from '../services/paginator.service';
import PostsService from '../services/posts.service';
import PostMetaService from '../services/post-meta.service';
import TaxonomiesService from '../services/taxonomies.service';
import UsersService from '../services/users.service';
import UtilService from '../services/util.service';
import VotesService from '../services/votes.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, credentialsConfig, redisConfig]
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule, LoggerModule],
      inject: [ConfigService, LoggerService],
      useClass: DbConfigService
    }),
    SequelizeModule.forFeature([
      PostModel,
      PostMetaModel,
      UserModel,
      UserMetaModel,
      CommentModel,
      CommentMetaModel,
      VoteModel,
      TaxonomyModel,
      TaxonomyRelationshipModel,
      LinkModel,
      OptionModel,
      BookModel,
      NoteModel,
      MaterialModel,
      VPostDateArchiveModel,
      VPostViewAverageModel
    ]),
    AdminModule
  ],
  controllers: [AdminController, AdminPostController, AdminCommentController, AdminTaxonomyController],
  providers: [
    AppService,
    LoggerService,
    UtilService,
    CommonService,
    PostsService,
    PostMetaService,
    LinksService,
    PaginatorService,
    CrumbService,
    TaxonomiesService,
    OptionsService,
    CommentsService,
    UsersService,
    VotesService
  ]
})
export default class AdminModule {
}
