import { Injectable } from '@nestjs/common';
import * as gmLib from 'gm';
import { OptionEntity } from '../option/option.interface';

@Injectable()
export class WatermarkService {
  constructor() {
  }

  async watermark(imgPath: string, options: OptionEntity) {
    return new Promise((resolve, reject) => {
      const gm = gmLib.subClass({ imageMagick: true });
      const fontSize = 18;
      const lineMargin = 2;
      const markWidth = 138;
      const markHeight = fontSize * 2 + lineMargin;
      // 字体实际高度比字体大小略小≈17
      const markMarginX = 10;
      const markMarginY = 6;
      const copy = `@${options['site_name']}`;
      const domain = options['site_domain'];
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
        gmImg.font(options['watermark_font_path'], fontSize)
          .fill('#222222')
          .drawText(markMarginX, markMarginY + fontSize + lineMargin, copy, 'SouthEast')
          .drawText(markMarginX, markMarginY, domain, 'SouthEast')
          .fill('#ffffff')
          .drawText(markMarginX + 1, markMarginY + fontSize + lineMargin + 1, copy, 'SouthEast')
          .drawText(markMarginX + 1, markMarginY + 1, domain, 'SouthEast');
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
