import { Controller, Get, HttpStatus, Param, Query, Render, Req } from '@nestjs/common';
import ParseIntPipe from '../../pipes/parse-int.pipe';
import TrimPipe from '../../pipes/trim.pipe';
import Search from '../../decorators/search.decorator';
import TaxonomiesService from '../../services/taxonomies.service';
import { ResponseCode, TaxonomyStatus, TaxonomyStatusDesc, TaxonomyType, TaxonomyTypeDesc } from '../../common/enums';
import CustomException from '../../exceptions/custom.exception';
import UtilService from '../../services/util.service';
import OptionsService from '../../services/options.service';
import PaginatorService from '../../services/paginator.service';

@Controller('admin/taxonomy')
export default class AdminTaxonomyController {
  constructor(
    private readonly taxonomiesService: TaxonomiesService,
    private readonly optionsService: OptionsService,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService
  ) {
  }

  @Get(['', 'page-:page'])
  @Render('admin/pages/taxonomy-list')
  async showTaxonomies(
    @Req() req,
    @Param('page', new ParseIntPipe(1)) page,
    @Query('type', new TrimPipe()) type,
    @Query('status', new ParseIntPipe()) status,
    @Query('keyword', new TrimPipe()) keyword,
    @Search() search
  ) {
    if (!type || !Object.keys(TaxonomyType).map((key) => TaxonomyType[key]).includes(type)) {
      throw new CustomException(ResponseCode.TAXONOMY_TYPE_INVALID, HttpStatus.FORBIDDEN, '查询参数有误');
    }
    if (status &&  !Object.keys(TaxonomyStatus).map((key) => TaxonomyStatus[key]).includes(status)) {
      throw new CustomException(ResponseCode.TAXONOMY_STATUS_INVALID, HttpStatus.FORBIDDEN, '查询参数有误');
    }
    const options = await this.optionsService.getOptions();
    const taxonomyList = await this.taxonomiesService.getTaxonomies({ page, type, status, keyword });
    const { taxonomies, count } = taxonomyList;
    page = taxonomyList.page;

    const searchParams: string[] = [];
    keyword && searchParams.push(keyword);
    status && searchParams.push(TaxonomyStatusDesc[this.utilService.getEnumKeyByValue(TaxonomyStatus, status)]);

    const taxonomyType = TaxonomyTypeDesc[this.utilService.getEnumKeyByValue(TaxonomyType, type)];
    const titles = ['管理后台', options.site_name.value];
    titles.unshift(taxonomyType);
    searchParams.length > 0 && titles.unshift(searchParams.join(' | '));
    page > 1 && titles.unshift(`第${page}页`);

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, count),
        linkUrl: '/admin/taxonomy/page-',
        linkParam: search
      },
      token: req.csrfToken(),
      curNav: `taxonomy-${type}`,
      options,
      taxonomies,
      taxonomyStatus: this.taxonomiesService.getAllTaxonomyStatus(),
      type,
      taxonomyType,
      curStatus: status,
      curKeyword: keyword
    };
  }
}
