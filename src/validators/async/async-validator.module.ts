import { Module } from '@nestjs/common';
import { IsPostExistConstraint } from './is-post-exist.validator';
import { IsSlugExistConstraint } from './is-slug-exist.validator';
import { IsTaxonomyExistConstraint } from './is-taxonomy-exist.validator';
import { PostModule } from '../../modules/post/post.module';
import { TaxonomyModule } from '../../modules/taxonomy/taxonomy.module';

@Module({
  imports: [
    PostModule,
    TaxonomyModule
  ],
  providers: [
    IsPostExistConstraint,
    IsTaxonomyExistConstraint,
    IsSlugExistConstraint
  ],
  exports: [
    IsPostExistConstraint,
    IsTaxonomyExistConstraint,
    IsSlugExistConstraint
  ]
})
export class AsyncValidatorModule {}
