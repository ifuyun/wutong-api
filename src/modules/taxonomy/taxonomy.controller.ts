import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import * as xss from 'sanitizer';
import { Role, TaxonomyStatus, TaxonomyStatusDesc, TaxonomyType, TaxonomyTypeDesc } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IdParams } from '../../decorators/id-params.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { Search } from '../../decorators/search.decorator';
import { RemoveTaxonomyDto, TaxonomyDto } from '../../dtos/taxonomy.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { format, getEnumKeyByValue } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { AuthUserEntity } from '../../interfaces/auth.interface';
import { TaxonomyNode, TaxonomyQueryParam } from '../../interfaces/taxonomies.interface';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { OptionsService } from '../option/options.service';
import { PaginatorService } from '../paginator/paginator.service';
import { UtilService } from '../util/util.service';
import { TaxonomiesService } from './taxonomies.service';

@Controller('')
export class TaxonomyController {
  constructor(
    private readonly taxonomiesService: TaxonomiesService,
    private readonly optionsService: OptionsService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService
  ) {
  }

  @Get('api/taxonomies/taxonomy-tree')
  @Header('Content-Type', 'application/json')
  async getTaxonomyTree(@AuthUser() user: AuthUserEntity) {
    const taxonomies = await this.taxonomiesService.getTaxonomyTreeData(
      user.isAdmin ? [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE] : TaxonomyStatus.PUBLISH);
    const taxonomyTree = this.taxonomiesService.generateTaxonomyTree(taxonomies);

    return getSuccessResponse(taxonomyTree);
  }

  @Get('api/taxonomies')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async getTaxonomies(
    @Query('page', new ParseIntPipe(1)) page: number,
    @Query('pageSize', new ParseIntPipe(10)) pageSize: number,
    @Query('type', new TrimPipe(), new LowerCasePipe()) type: TaxonomyType,
    @Query('status', new TrimPipe()) status: TaxonomyStatus | TaxonomyStatus[],
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('orders', new TrimPipe()) orders: string[]
  ) {
    if (!type || !Object.keys(TaxonomyType).map((key) => TaxonomyType[key]).includes(type)) {
      throw new BadRequestException(<Message>format(Message.INVALID_PARAMS, type), ResponseCode.TAXONOMY_TYPE_INVALID);
    }
    const param: TaxonomyQueryParam = {
      page,
      pageSize,
      type,
      keyword
    };
    if (status) {
      status = typeof status === 'string' ? [status] : status;
      const allowedStatuses = this.taxonomiesService.getAllTaxonomyStatusValues();
      status.forEach((v) => {
        if (!allowedStatuses.includes(v)) {
          throw new BadRequestException(
            <Message>format(Message.INVALID_PARAMS, JSON.stringify(status)),
            ResponseCode.TAXONOMY_STATUS_INVALID
          );
        }
      });
      param.status = status;
    }
    if (orders.length > 0) {
      param.orders = getQueryOrders({
        termOrder: 1
      }, orders);
    }

    const taxonomies = await this.taxonomiesService.getTaxonomies(param);
    return getSuccessResponse(taxonomies);
  }

  @Get('api/tags')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async getTags(
    @Query('keyword', new TrimPipe()) keyword: string
  ) {
    if (!keyword) {
      throw new BadRequestException(Message.MISSED_PARAMS);
    }
    const tags = await this.taxonomiesService.searchTags(keyword);
    const tagList: string[] = tags.map((item) => item.name);

    return getSuccessResponse(tagList);
  }

  @Post('api/taxonomies/update-count')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async updateCount(@Body(new TrimPipe()) body: { type: TaxonomyType }) {
    if (body.type && ![TaxonomyType.POST, TaxonomyType.TAG, TaxonomyType.LINK].includes(body.type)) {
      return new BadRequestException(Message.ILLEGAL_PARAM);
    }
    await this.taxonomiesService.updateAllCount(body.type);

    return getSuccessResponse();
  }

  @Get(['admin/taxonomy', 'admin/taxonomy/page-:page'])
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Render('admin/pages/taxonomy-list')
  async showTaxonomies(
    @Req() req: Request,
    @Param('page', new ParseIntPipe(1)) page: number,
    @Query('type', new TrimPipe(), new LowerCasePipe()) type: TaxonomyType,
    @Query('status', new ParseIntPipe()) status: TaxonomyStatus,
    @Query('keyword', new TrimPipe()) keyword: string,
    @Search() search: Record<string, any>
  ) {
    if (!type || !Object.keys(TaxonomyType).map((key) => TaxonomyType[key]).includes(type)) {
      throw new CustomException('查询参数有误', HttpStatus.FORBIDDEN, ResponseCode.TAXONOMY_TYPE_INVALID);
    }
    if (status && !this.taxonomiesService.getAllTaxonomyStatusValues().includes(status)) {
      throw new CustomException('查询参数有误', HttpStatus.FORBIDDEN, ResponseCode.TAXONOMY_STATUS_INVALID);
    }
    const options = await this.optionsService.getOptions();
    const taxonomyList = await this.taxonomiesService.getTaxonomies({ page, type, status: [status], keyword });
    const { taxonomies, total } = taxonomyList;
    page = taxonomyList.page;

    const searchParams: string[] = [];
    keyword && searchParams.push(keyword);
    status && searchParams.push(TaxonomyStatusDesc[getEnumKeyByValue(TaxonomyStatus, status)]);

    const taxonomyType = TaxonomyTypeDesc[getEnumKeyByValue(TaxonomyType, type)];
    const titles = ['管理后台', options.site_name];
    titles.unshift(taxonomyType);
    searchParams.length > 0 && titles.unshift(searchParams.join(' | '));
    page > 1 && titles.unshift(`第${page}页`);

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name}管理后台`,
        author: options.site_author
      },
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, total),
        linkUrl: '/admin/taxonomy/page-',
        linkParam: search
      },
      // token: req.csrfToken(),
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

  @Get('admin/taxonomy/detail')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Render('admin/pages/taxonomy-form')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['id'] })
  async editTaxonomy(
    @Req() req: Request,
    @Query('id', new TrimPipe()) taxonomyId: string,
    @Query('parent', new TrimPipe()) parentId: string,
    @Query('action', new TrimPipe()) action: string,
    @Query('type', new TrimPipe(), new LowerCasePipe()) type: TaxonomyType,
    @Referer() referer: string,
    @Session() session: any
  ) {
    if (!['create', 'edit'].includes(action)) {
      throw new CustomException('操作不允许。', HttpStatus.FORBIDDEN, ResponseCode.FORBIDDEN);
    }
    if (!Object.keys(TaxonomyType).map((k) => TaxonomyType[k]).includes(type)) {
      throw new CustomException('操作不允许。', HttpStatus.FORBIDDEN, ResponseCode.FORBIDDEN);
    }
    let taxonomy = {
      parentId: parentId || ''
    };
    const typeDesc: string = type === TaxonomyType.TAG ? '标签' : '分类';
    if (action === 'edit') {
      taxonomy = await this.taxonomiesService.getTaxonomyById(taxonomyId);
      if (!taxonomy) {
        throw new CustomException(`${typeDesc}不存在。`, HttpStatus.NOT_FOUND, ResponseCode.TAXONOMY_NOT_FOUND);
      }
    }
    let taxonomyList: TaxonomyNode[] = [];
    if (type !== TaxonomyType.TAG) {
      const taxonomyData = await this.taxonomiesService.getTaxonomyTreeData([TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE], type);
      const taxonomyTree = this.taxonomiesService.generateTaxonomyTree(taxonomyData);
      taxonomyList = this.taxonomiesService.flattenTaxonomyTree(taxonomyTree, []);
    }
    const options = await this.optionsService.getOptions();
    const titles = ['管理后台', options.site_name];
    let title: string;
    if (action === 'create') {
      title = `新增${typeDesc}`;
      titles.unshift(title);
    } else {
      title = `编辑${typeDesc}`;
      titles.unshift(taxonomy['name'], title);
    }
    session.taxonomyReferer = referer;

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name}管理后台`,
        author: options.site_author
      },
      curNav: `taxonomy-${type}`,
      // token: req.csrfToken(),
      title,
      type,
      options,
      taxonomy,
      taxonomyList
    };
  }

  @Post('admin/taxonomy/save')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveTaxonomy(
    @Req() req: Request,
    @Body(new TrimPipe()) taxonomyDto: TaxonomyDto,
    @Session() session: any
  ) {
    const type = taxonomyDto.type.toLowerCase();
    taxonomyDto = {
      taxonomyId: taxonomyDto.taxonomyId,
      name: xss.sanitize(taxonomyDto.name),
      slug: xss.sanitize(taxonomyDto.slug),
      description: xss.sanitize(taxonomyDto.description),
      parentId: type !== TaxonomyType.TAG ? taxonomyDto.parentId : '',
      termOrder: taxonomyDto.termOrder,
      status: taxonomyDto.status,
      type
    };
    const result = await this.taxonomiesService.saveTaxonomy(taxonomyDto);
    if (!result) {
      throw new CustomException('保存失败。', HttpStatus.OK, ResponseCode.TAXONOMY_SAVE_ERROR);
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

  @Post('admin/taxonomy/remove')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async removeTaxonomies(
    @Req() req: Request,
    @Query('type', new TrimPipe(), new LowerCasePipe()) type: string,
    @Body(new TrimPipe()) removeTaxonomyDto: RemoveTaxonomyDto,
    @Referer() referer: string
  ) {
    if (!Object.keys(TaxonomyType).map((k) => TaxonomyType[k]).includes(type)) {
      throw new CustomException('操作不允许。', HttpStatus.OK, ResponseCode.FORBIDDEN);
    }
    const result = await this.taxonomiesService.removeTaxonomies(type, removeTaxonomyDto.taxonomyIds);
    if (!result) {
      throw new CustomException('删除失败。', HttpStatus.OK, ResponseCode.TAXONOMY_DELETE_ERROR);
    }

    return {
      code: 0,
      data: {
        url: referer || '/admin/taxonomy?type=' + type
      }
    };
  }
}
