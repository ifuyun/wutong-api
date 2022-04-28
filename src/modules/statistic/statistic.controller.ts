import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { PostType, Role, TaxonomyType } from '../../common/common.enum';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CommentService } from '../comment/comment.service';
import { LoggerService } from '../logger/logger.service';
import { PostService } from '../post/post.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';

@Controller('api/statistics')
export class StatisticController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    private readonly taxonomyService: TaxonomyService,
    private readonly logger: LoggerService
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async getStatData() {
    const postCount = await this.postService.countPostsByType();
    const posts = postCount.filter((item) => item.postType === PostType.POST).map((item) => item.count);
    const pages = postCount.filter((item) => item.postType === PostType.PAGE).map((item) => item.count);
    const files = postCount.filter((item) => item.postType === PostType.ATTACHMENT).map((item) => item.count);
    const comments = await this.commentService.countComments();
    const taxonomyCount = await this.taxonomyService.countTaxonomiesByType();
    const categories = taxonomyCount.filter((item) => item.taxonomyType === TaxonomyType.POST).map((item) => item.count);
    const tags = taxonomyCount.filter((item) => item.taxonomyType === TaxonomyType.TAG).map((item) => item.count);

    return getSuccessResponse({
      posts: posts[0],
      pages: pages[0],
      files: files[0],
      comments,
      categories: categories[0],
      tags: tags[0]
    });
  }
}
