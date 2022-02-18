import { forwardRef, Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { DashboardController } from '../dashboard/dashboard.controller';
import { PostsService } from './posts.service';
import { PostMetaService } from './post-meta.service';
import { AdminFileController } from './admin-file.controller';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { PaginatorModule } from '../paginator/paginator.module';
import { UtilModule } from '../util/util.module';
import { PostCommonService } from './post-common.service';
import { LinkModule } from '../link/link.module';
import { CommentModule } from '../comment/comment.module';
import { CrumbModule } from '../crumb/crumb.module';
import { AdminPostController } from './admin-post.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    UtilModule,
    PaginatorModule,
    CrumbModule,
    OptionModule,
    TaxonomyModule,
    forwardRef(() => CommentModule),
    LinkModule,
    UserModule
  ],
  controllers: [
    PostController,
    DashboardController,
    AdminPostController,
    AdminFileController
  ],
  providers: [
    PostsService,
    PostMetaService,
    PostCommonService
  ],
  exports: [
    PostsService,
    PostMetaService,
    PostCommonService
  ]
})
export class PostModule {}
