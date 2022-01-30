import { Injectable } from '@nestjs/common';
import { OptionData } from '../interfaces/options.interface';
import { PostSlugPrefixBlacklist } from '../common/enums';

@Injectable()
export default class UtilService {
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

  getSiteDescription(options: Record<string, OptionData>): string {
    return options.site_name.value + '：' + options.site_description.value;
  }

  getPostSlugPrefixBlacklist(): string[] {
    const blacklist: string[] = [];
    Object.keys(PostSlugPrefixBlacklist).forEach((key) => {
      blacklist.push(PostSlugPrefixBlacklist[key]);
    });
    return blacklist;
  }

  isReqPathLikePostSlug(reqPath: string): boolean {
    if (!reqPath.startsWith('/')) {
      reqPath = '/' + reqPath;
    }
    if (!reqPath || /^\/+$/i.test(reqPath)) {
      return false;
    }
    const blacklist = this.getPostSlugPrefixBlacklist();
    for (let i = 0; i < blacklist.length; i += 1) {
      if (reqPath.indexOf(blacklist[i]) >= 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * 判断数组是否含有指定元素
   * @param {*} elem 元素
   * @param {Array} arr 数组
   * @param {number} i 判断起始位置
   * @return {number} 判断结果：找到返回所在位置，否则返回-1
   * @version 1.0.0
   * @since 1.0.0
   */
  static inArray(elem, arr, i) {
    if (arr) {
      const len = arr.length;
      i = i ? i < 0 ? Math.max(0, len + i) : i : 0;

      while (i < len) {
        // Skip accessing in sparse arrays
        if (arr.hasOwnProperty(i) && arr[i] === elem) {
          return i;
        }
        i += 1;
      }
    }

    return -1;
  }

  /**
   * 去除头尾空白字符
   * @param {string|Undefined} str 源字符串
   * @return {string} 处理后的字符串
   * @version 1.0.0
   * @since 1.0.0
   */
  // static trim(str) {
  //   return str ? str.trim() : '';
  // }

  /**
   * 判断是否已登录
   * @param {Object} user user对象
   * @return {boolean} 判断结果：已登录返回true，否则返回false
   * @version 1.0.0
   * @since 1.0.0
   */
  static isLogin(user) {
    return user ? !!user : false;
  }

  /**
   * 判断登录用户是否管理员
   * @param {Object} user user对象
   * @return {boolean} 判断结果：是管理员返回true，否则返回false
   * @version 1.0.0
   * @since 1.0.0
   */
  static isAdminUser(user) {
    return UtilService.isLogin(user) && user.userMeta && user.userMeta.role === 'admin';
  }
}
