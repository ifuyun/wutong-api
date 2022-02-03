import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import * as xss from 'sanitizer';
import ParseIntPipe from '../../pipes/parse-int.pipe';
import TrimPipe from '../../pipes/trim.pipe';
import Search from '../../decorators/search.decorator';
import TaxonomiesService from '../../services/taxonomies.service';
import { ResponseCode, TaxonomyStatus, TaxonomyStatusDesc, TaxonomyType, TaxonomyTypeDesc } from '../../common/enums';
import CustomException from '../../exceptions/custom.exception';
import UtilService from '../../services/util.service';
import OptionsService from '../../services/options.service';
import PaginatorService from '../../services/paginator.service';
import CheckIdInterceptor from '../../interceptors/check-id.interceptor';
import { IdParams } from '../../decorators/id-params.decorator';
import Referer from '../../decorators/referer.decorator';
import { TaxonomyNode } from '../../interfaces/taxonomies.interface';
import ExceptionFactory from '../../validators/exception-factory';
import TaxonomyDto from '../../dtos/taxonomy.dto';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { ID_REG } from '../../common/constants';

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
    @Query('type', new TrimPipe(), new LowerCasePipe()) type,
    @Query('status', new ParseIntPipe()) status,
    @Query('keyword', new TrimPipe()) keyword,
    @Search() search
  ) {
    if (!type || !Object.keys(TaxonomyType).map((key) => TaxonomyType[key]).includes(type)) {
      throw new CustomException(ResponseCode.TAXONOMY_TYPE_INVALID, HttpStatus.FORBIDDEN, '查询参数有误');
    }
    if (status && !this.taxonomiesService.getAllTaxonomyStatusValues().includes(status)) {
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

  @Get('detail')
  @Render('admin/pages/taxonomy-form')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['id'] })
  async editTaxonomy(
    @Req() req,
    @Query('id', new TrimPipe()) taxonomyId,
    @Query('parent', new TrimPipe()) parentId,
    @Query('action', new TrimPipe()) action,
    @Query('type', new TrimPipe(), new LowerCasePipe()) type,
    @Referer() referer,
    @Session() session
  ) {
    if (!['create', 'edit'].includes(action)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.FORBIDDEN, '操作不允许。');
    }
    if (!Object.keys(TaxonomyType).map((k) => TaxonomyType[k]).includes(type)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.FORBIDDEN, '操作不允许。');
    }
    let taxonomy = {
      parent: parentId || ''
    };
    if (action === 'edit') {
      taxonomy = await this.taxonomiesService.getTaxonomyById(taxonomyId);
    }
    let taxonomyList: TaxonomyNode[] = [];
    if (type !== TaxonomyType.TAG) {
      const taxonomyData = await this.taxonomiesService.getAllTaxonomies([], type);
      const taxonomies = this.taxonomiesService.getTaxonomyTree(taxonomyData);
      taxonomyList = taxonomies.taxonomyList;
    }
    const options = await this.optionsService.getOptions();
    const titles = ['管理后台', options.site_name.value];
    let title = '';
    if (action === 'create') {
      title = type === 'tag' ? '新增标签' : '新增分类';
      titles.unshift(title);
    } else {
      title = type === 'tag' ? '编辑标签' : '编辑分类';
      titles.unshift(taxonomy['name'], title);
    }
    session.taxonomyReferer = referer;

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      token: req.csrfToken(),
      curNav: `taxonomy-${type}`,
      title,
      type,
      options,
      taxonomy,
      taxonomyList
    };
  }

  @Post('save')
  @UsePipes(new ValidationPipe({
    transform: true,
    skipNullProperties: true,
    stopAtFirstError: true,
    exceptionFactory: ExceptionFactory
  }))
  @Header('Content-Type', 'application/json')
  async saveTaxonomy(
    @Req() req,
    @Query('type', new TrimPipe(), new LowerCasePipe()) type,
    @Body(new TrimPipe()) taxonomyDto: TaxonomyDto,
    @Session() session
  ) {
    // Body参数无法完成自动类型转换，因此虽然DTO定义是number，但实际仍是string，导致无法直接调用parseInt
    taxonomyDto.status = Number(taxonomyDto.status);
    if (!Object.keys(TaxonomyType).map((k) => TaxonomyType[k]).includes(type)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.OK, '操作不允许。');
    }
    if (!this.taxonomiesService.getAllTaxonomyStatusValues().includes(taxonomyDto.status)) {
      throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.OK, '请选择有效的状态。');
    }
    if (type !== TaxonomyType.TAG && (!taxonomyDto.termOrder || !/^\d+$/i.test(taxonomyDto.termOrder.toString()))) {
      throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.OK, '排序必须为数字。');
    }
    taxonomyDto = {
      taxonomyId: xss.sanitize(taxonomyDto.taxonomyId),
      name: xss.sanitize(taxonomyDto.name),
      slug: xss.sanitize(taxonomyDto.slug),
      description: xss.sanitize(taxonomyDto.description),
      parent: type !== TaxonomyType.TAG ? xss.sanitize(taxonomyDto.parent) : '',
      termOrder: xss.sanitize(taxonomyDto.termOrder),
      status: taxonomyDto.status,
      type
    };
    const slugExist = await this.taxonomiesService.checkTaxonomySlugExist(taxonomyDto.slug, taxonomyDto.taxonomyId);
    if (slugExist) {
      throw new CustomException(ResponseCode.TAXONOMY_SLUG_DUPLICATE, HttpStatus.OK, `别名${taxonomyDto.slug}已存在。`);
    }
    const result = await this.taxonomiesService.saveTaxonomy(taxonomyDto);
    if (result < 1) {
      throw new CustomException(ResponseCode.TAXONOMY_SAVE_ERROR, HttpStatus.OK, '保存失败。');
    }
    const referer = session.taxonomyReferer;
    delete session.taxonomyReferer;

    return {
      code: ResponseCode.SUCCESS,
      data: {
        url: referer || ('/admin/taxonomy?type=' + type)
      }
    };
  }

  @Post('remove')
  async removeTaxonomies(
    @Req() req,
    @Query('type', new TrimPipe(), new LowerCasePipe()) type,
    @Body(new TrimPipe()) data,
    @Referer() referer
  ) {
    if (!Object.keys(TaxonomyType).map((k) => TaxonomyType[k]).includes(type)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.OK, '操作不允许。');
    }
    let taxonomyIds: string[] = [];
    if (typeof data.taxonomyIds ==='string') {
      taxonomyIds = data.taxonomyIds.split(',');
    } else if (Array.isArray(data.taxonomyIds)) {
      taxonomyIds = data.taxonomyIds;
    }
    if (taxonomyIds.length < 1) {
      throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.OK, '请选择要删除的分类。');
    }
    taxonomyIds.forEach((id) => {
      if (!ID_REG.test(id)) {
        throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.OK, '请求参数错误');
      }
    });
    const result = await this.taxonomiesService.removeTaxonomies(type, taxonomyIds);
    if (!result) {
      throw new CustomException(ResponseCode.TAXONOMY_DELETE_ERROR, HttpStatus.OK, '删除失败。');
    }

    return {
      code: 0,
      data: {
        url: referer || '/admin/taxonomy?type=' + type
      }
    };
  }
}
