import { Injectable } from '@nestjs/common';
import { PostsService } from './posts.service';
import { LinksService } from '../link/links.service';
import { OptionsService } from '../option/options.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { LinkVisible, PostType } from '../../common/common.enum';

@Injectable()
export class PostCommonService {
  constructor(
    private readonly postsService: PostsService,
    private readonly linksService: LinksService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly optionsService: OptionsService
  ) {
  }

  async getCommonData(param: { from: string, isAdmin: boolean, postType?: string, page?: number, archiveLimit?: number }) {
    const friendLinksVisible = param.from !== 'list' || param.page > 1 ? LinkVisible.SITE : [LinkVisible.HOMEPAGE, LinkVisible.SITE];
    return Promise.all([
      this.optionsService.getOptions(),
      this.taxonomiesService.getAllTaxonomies(param.isAdmin ? [0, 1] : 1),
      this.linksService.getFriendLinks(friendLinksVisible),
      this.linksService.getQuickLinks(),
      this.postsService.getArchiveDates({
        postType: <PostType>param.postType,
        showCount: true,
        isAdmin: param.isAdmin,
        limit: param.archiveLimit
      }),
      this.postsService.getRandomPosts(),
      this.postsService.getHotPosts()
    ]).then(results => Promise.resolve({
      options: results[0],
      taxonomies: this.taxonomiesService.getTaxonomyTree(results[1]),
      friendLinks: results[2],
      quickLinks: results[3],
      archiveDates: results[4],
      randPosts: results[5],
      hotPosts: results[6]
    }));
  }
}
