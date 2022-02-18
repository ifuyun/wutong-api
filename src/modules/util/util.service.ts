import { Injectable } from '@nestjs/common';
import { PostSlugPrefixBlacklist } from '../../common/common.enum';
import { getEnumValues } from '../../helpers/helper';
import { OptionEntity } from '../../interfaces/options.interface';

@Injectable()
export class UtilService {
  /**
   * 拼接标题
   * @param {string|Array} titleArr 标题数组
   * @param {string} [delimiter=' - '] 分隔符
   * @return {string} 拼接后的字符串
   * @version 1.0.0
   * @since 1.0.0
   */
  getTitle(titleArr: string | string [], delimiter = ' - '): string {
    if (!titleArr) {
      titleArr = [];
    }
    if (typeof titleArr === 'string') {
      titleArr = [titleArr];
    }

    return titleArr.join(delimiter);
  }

  getSiteDescription(options: OptionEntity): string {
    return options.site_name + '：' + options.site_description;
  }

  isUrlPathLikePostSlug(urlPath: string): boolean {
    if (!urlPath.startsWith('/')) {
      urlPath = '/' + urlPath;
    }
    if (/^\/+$/i.test(urlPath)) {
      return false;
    }
    const blacklist = <string[]>getEnumValues(PostSlugPrefixBlacklist);
    for (let prefix of blacklist) {
      if (urlPath.startsWith(prefix)) {
        return false;
      }
    }
    return true;
  }
}
