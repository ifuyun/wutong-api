import { Injectable } from '@nestjs/common';
import LinksService from './links.service';
import OptionsService from './options.service';
import PostsService from './posts.service';
import TaxonomiesService from './taxonomies.service';

@Injectable()
export default class CommonService {
  constructor(
    private readonly postsService: PostsService,
    private readonly linksService: LinksService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly optionsService: OptionsService
  ) {
  }

  async getCommonData(param: { from: string, isAdmin: boolean, postType?: string, page?: number, archiveLimit?: number }) {
    return Promise.all([
      this.optionsService.getOptions(),
      this.taxonomiesService.getAllTaxonomies(param.isAdmin ? [0, 1] : [1]),
      this.linksService.getFriendLinks({
        page: param.page,
        from: param.from
      }),
      this.linksService.getQuickLinks(),
      this.postsService.getArchiveDates({
        postType: param.postType,
        showCount: true,
        isAdmin: param.isAdmin,
        limit: param.archiveLimit
      }),
      this.postsService.getRecentPosts(),
      this.postsService.getRandPosts(),
      this.postsService.getHotPosts()
    ]).then(results => Promise.resolve({
      options: results[0],
      taxonomies: this.taxonomiesService.getTaxonomyTree(results[1]),
      friendLinks: results[2],
      quickLinks: results[3],
      archiveDates: results[4],
      recentPosts: results[5],
      randPosts: results[6],
      hotPosts: results[7]
    }));
  }
}
