import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as gmLib from 'gm';
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
    private readonly optionsService: OptionsService,
    private readonly configService: ConfigService
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

  async watermark(imgPath: string) {
    return new Promise((resolve, reject) => {
      const gm = gmLib.subClass({ imageMagick: true });
      const fontSize = 18;
      const lineMargin = 2;
      const markWidth = 138;
      const markHeight = fontSize * 2 + lineMargin;
      // 字体实际高度比字体大小略小≈17
      const markMarginX = 10;
      const markMarginY = 6;
      const copy = `@${this.configService.get('app.siteName')}`;
      const site = this.configService.get('app.domain');
      // todo: move to db.options
      const fontPath = this.configService.get('credentials.watermark.fontPath');
      let imgWidth;
      let imgHeight;
      let markedWidth;
      let markedHeight;
      let ratio = 1;
      let gmImg = gm(imgPath);
      gmImg.size((err, data) => {
        if (err) {
          return reject(err);
        }
        imgWidth = markedWidth = data.width;
        imgHeight = markedHeight = data.height;
        ratio = Math.max(markWidth / imgWidth, markHeight / imgHeight);

        if (ratio > 1) {
          markedWidth = imgWidth * ratio;
          markedHeight = imgHeight * ratio;
          gmImg = gmImg.resize(markedWidth, markedHeight, '!');
        }
        gmImg.font(fontPath, fontSize)
          .fill('#222222')
          .drawText(markMarginX, markMarginY + fontSize + lineMargin, copy, 'SouthEast')
          .drawText(markMarginX, markMarginY, site, 'SouthEast')
          .fill('#ffffff')
          .drawText(markMarginX + 1, markMarginY + fontSize + lineMargin + 1, copy, 'SouthEast')
          .drawText(markMarginX + 1, markMarginY + 1, site, 'SouthEast');
        if (ratio > 1) {
          gmImg = gmImg.resize(markedWidth / ratio, markedHeight / ratio, '!');
        }
        gmImg.write(imgPath, (err) => {
          if (err) {
            return reject(err);
          }
          resolve(true);
        });
      });
    });
  }
}
