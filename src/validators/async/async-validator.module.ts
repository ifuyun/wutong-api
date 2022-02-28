import { Module } from '@nestjs/common';
import { CommentModule } from '../../modules/comment/comment.module';
import { IsCommentExistConstraint } from './is-comment-exist.validator';
import { IsPostExistConstraint } from './is-post-exist.validator';
import { IsSlugExistConstraint } from './is-slug-exist.validator';
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
    IsSlugExistConstraint,
    IsCommentExistConstraint
  ],
  exports: [
    IsPostExistConstraint,
    IsTaxonomyExistConstraint,
    IsSlugExistConstraint,
    IsCommentExistConstraint
  ]
})
export class AsyncValidatorModule {}
