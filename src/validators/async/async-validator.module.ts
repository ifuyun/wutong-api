import { Module } from '@nestjs/common';
import { CommentModule } from '../../modules/comment/comment.module';
import { IsCommentExistConstraint } from './is-comment-exist.validator';
import { IsPostExistConstraint } from './is-post-exist.validator';
import { IsTaxonomySlugExistConstraint } from './is-taxonomy-slug-exist.validator';
import { IsTaxonomyExistConstraint } from './is-taxonomy-exist.validator';
import { PostModule } from '../../modules/post/post.module';
import { TaxonomyModule } from '../../modules/taxonomy/taxonomy.module';

@Module({
  imports: [
    PostModule,
    TaxonomyModule,
    CommentModule
  ],
  providers: [
    IsPostExistConstraint,
    IsTaxonomyExistConstraint,
    IsTaxonomySlugExistConstraint,
    IsCommentExistConstraint
  ],
  exports: [
    IsPostExistConstraint,
    IsTaxonomyExistConstraint,
    IsTaxonomySlugExistConstraint,
    IsCommentExistConstraint
  ]
})
export class AsyncValidatorModule {}
