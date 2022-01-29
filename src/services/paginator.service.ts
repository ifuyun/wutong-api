import { Injectable } from '@nestjs/common';
import { PaginatorData } from '../interfaces/paginator.interface';

@Injectable()
export default class PaginatorService {
  private pageSize: number = 10;
  private paginationSize: number = 9;

  getPageSize(): number {
    return this.pageSize;
  }

  setPageSize(pageSize: number) {
    this.pageSize = pageSize;
  }

  /**
   * 获取分页数据
   * @param {number} page 请求页
   * @param {number} count 总记录数
   * @param {number} paginationSize 每页显示页数
   * @return {Object} 分页数据对象
   * @version 1.0.0
   * @since 1.0.0
   */
  getPageData(page, count, paginationSize) {
    let pages = Math.ceil(count / this.pageSize);// 总页数
    let pageData = {
      start: 1,
      end: 1
    };
    // 中间页
    const floorPage = Math.floor((paginationSize + 1) / 2);
    // 中间页到两边的间距页数，偶数情况距离低页再减一，距离高页不变
    const ceilPage = Math.ceil((paginationSize - 1) / 2);

    if (pages <= paginationSize) {// 总页数小于一屏输出页数
      pageData.start = 1;
      pageData.end = pages;
    } else if (page <= floorPage) {// 第一屏
      pageData.start = 1;
      pageData.end = paginationSize;
    } else if (page > floorPage && (page + ceilPage) <= pages) {// 非第一屏，且非最后一屏
      pageData.start = page - ceilPage + (paginationSize + 1) % 2;
      pageData.end = page + ceilPage;
    } else {// 最后一屏
      pageData.start = pages - paginationSize + 1;
      pageData.end = pages;
    }

    return pageData;
  }

  /**
   * 生成分页对象
   * @param {number|string} [page=1] 请求页
   * @param {number} [count] 总记录数
   * @param {number} [paginationSize=9] 每页显示页数
   * @return {Object} 分页对象
   * @version 1.0.0
   * @since 1.0.0
   */
  getPaginator(page: string | number, count: number, paginationSize?: number): PaginatorData {
    let pages = Math.ceil(count / this.pageSize);// 总页数
    if (typeof page === 'string') {// page是字符串
      page = parseInt(page, 10);
    }
    page = page || 1;
    pages = pages || 1;
    paginationSize = paginationSize || this.paginationSize;
    page = Math.min(pages, page);

    const pageData = this.getPageData(page, count, paginationSize);

    return {
      startPage: pageData.start,
      endPage: pageData.end,
      prevPage: page <= 1 ? 0 : (page - 1),
      nextPage: page >= pages ? 0 : (page + 1),
      curPage: page,
      totalPage: pages
    };
  }
}
