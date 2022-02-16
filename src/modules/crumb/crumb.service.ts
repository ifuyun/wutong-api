import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrumbEntity } from '../../interfaces/crumb.interface';

@Injectable()
export class CrumbService {
  constructor(private readonly configService: ConfigService) {
  }

  /**
   * 生成面包屑
   * @param {Array} crumbData 面包屑数据
   * @param {string} separator 分隔符
   * @return {string} 面包屑HTML
   */
  generateCrumb(crumbData: CrumbEntity[], separator: string = '&nbsp;→&nbsp;'): string {
    let crumbArr = [];
    crumbData.unshift({
      'label': '首页',
      'url': '/',
      'tooltip': this.configService.get('app.siteName'),
      'headerFlag': false
    });
    crumbData.forEach((crumb) => {
      if (crumb.url !== '' && !crumb.headerFlag) {
        crumbArr.push('<a title="' + crumb.tooltip + '" href="' + crumb.url + '">' + crumb.label + '</a>');
      } else if (crumb.url !== '' && crumb.headerFlag) {
        crumbArr.push('<h3><a title="' + crumb.tooltip + '" href="' + crumb.url + '">' + crumb.label + '</a></h3>');
      } else {
        crumbArr.push('<span title="' + crumb.tooltip + '">' + crumb.label + '</span>');
      }
    });
    return crumbArr.join(separator);
  }
}
