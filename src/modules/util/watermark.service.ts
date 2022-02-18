import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as gmLib from 'gm';

@Injectable()
export class WatermarkService {
  constructor(private readonly configService: ConfigService) {
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
      const fontPath = process.env.WATERMARK_FONT_PATH;
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
