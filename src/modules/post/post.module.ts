import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommentModule } from '../comment/comment.module';
import { CrumbModule } from '../crumb/crumb.module';
import { DatabaseModule } from '../database/database.module';
import { LinkModule } from '../link/link.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { PaginatorModule } from '../paginator/paginator.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { UserModule } from '../user/user.module';
import { UtilModule } from '../util/util.module';
import { AdminFileController } from './admin-file.controller';
import { AdminPostController } from './admin-post.controller';
import { PostMetaService } from './post-meta.service';
import { PostController } from './post.controller';
import { PostsService } from './posts.service';

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
    UserModule,
    AuthModule
  ],
  controllers: [
    PostController,
    AdminPostController,
    AdminFileController
  ],
  providers: [
    PostsService,
    PostMetaService
  ],
  exports: [
    PostsService,
    PostMetaService
  ]
})
export class PostModule {
}
