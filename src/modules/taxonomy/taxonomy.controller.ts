import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import * as xss from 'sanitizer';
import { TaxonomiesService } from './taxonomies.service';
import { UtilService } from '../util/util.service';
import { OptionsService } from '../option/options.service';
import { PaginatorService } from '../paginator/paginator.service';
import { Role, TaxonomyStatus, TaxonomyStatusDesc, TaxonomyType, TaxonomyTypeDesc } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { IdParams } from '../../decorators/id-params.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { Search } from '../../decorators/search.decorator';
import { RemoveTaxonomyDto, TaxonomyDto } from '../../dtos/taxonomy.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { getEnumKeyByValue } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { TaxonomyNode } from '../../interfaces/taxonomies.interface';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { AuthUserEntity } from '../../interfaces/auth.interface';

@Controller('')
export class TaxonomyController {
  constructor(
    private readonly taxonomiesService: TaxonomiesService,
    private readonly optionsService: OptionsService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService
  ) {
  }

  @Get('api/taxonomies')
  @Header('Content-Type', 'application/json')
  async getTaxonomyTree(@AuthUser() user: AuthUserEntity) {
    const taxonomies = await this.taxonomiesService.getAllTaxonomies(user.isAdmin ? [0, 1] : 1);
    const taxonomyTree = this.taxonomiesService.generateTaxonomyTree(taxonomies);

    return getSuccessResponse(taxonomyTree);
  }

  @Get(['admin/taxonomy', 'admin/taxonomy/page-:page'])
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Render('admin/pages/taxonomy-list')
  async showTaxonomies(
    @Req() req: Request,
    @Param('page', new ParseIntPipe(1)) page: number,
    @Query('type', new TrimPipe(), new LowerCasePipe()) type: string,
    @Query('status', new ParseIntPipe()) status: number,
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
    const taxonomyList = await this.taxonomiesService.getTaxonomies({ page, type, status, keyword });
    const { taxonomies, count } = taxonomyList;
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
        paginator: this.paginatorService.getPaginator(page, count),
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
      const taxonomyData = await this.taxonomiesService.getAllTaxonomies([0 ,1], type);
      const taxonomies = this.taxonomiesService.getTaxonomyTree(taxonomyData);
      taxonomyList = taxonomies.taxonomyList;
    }
    const options = await this.optionsService.getOptions();
    const titles = ['管理后台', options.site_name];
    let title = '';
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
    // todo: Body参数无法完成自动类型转换，因此虽然DTO定义是number，但实际仍是string，导致无法直接调用parseInt
    taxonomyDto.status = Number(taxonomyDto.status);
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
