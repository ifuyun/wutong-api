import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommentModule } from '../comment/comment.module';
import { DatabaseModule } from '../database/database.module';
import { LinkModule } from '../link/link.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { UserModule } from '../user/user.module';
import { UtilModule } from '../util/util.module';
import { AdminFileController } from './admin-file.controller';
import { PostMetaService } from './post-meta.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    UtilModule,
    OptionModule,
    TaxonomyModule,
    forwardRef(() => CommentModule),
    LinkModule,
    UserModule,
    AuthModule
  ],
  controllers: [
    PostController,
    AdminFileController
  ],
  providers: [
    PostService,
    PostMetaService
  ],
  exports: [
    PostService,
    PostMetaService
  ]
})
export class PostModule {
}
