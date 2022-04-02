import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import * as xss from 'sanitizer';
import { LinkVisible, Role, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { IdParams } from '../../decorators/id-params.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { Search } from '../../decorators/search.decorator';
import { LinkDto, RemoveLinkDto } from '../../dtos/link.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { LinkQueryParam } from '../../interfaces/links.interface';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { OptionsService } from '../option/options.service';
import { PaginatorService } from '../paginator/paginator.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { UtilService } from '../util/util.service';
import { LinksService } from './links.service';

@Controller('')
export class LinkController {
  constructor(
    private readonly linkService: LinksService,
    private readonly optionsService: OptionsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService
  ) {
  }

  @Get('api/links/quick')
  @Header('Content-Type', 'application/json')
  async getQuickLinks() {
    const links = await this.linkService.getQuickLinks();
    return getSuccessResponse(links);
  }

  @Get('api/links/friend')
  @Header('Content-Type', 'application/json')
  async getFriendLinks(
    @Query('visible') visible: string | string[],
    @Query('isHome') isHome: string
  ) {
    if (visible) {
      visible = Array.isArray(visible) ? visible : visible.split(',') || [];
      (visible as LinkVisible[]).forEach((v: LinkVisible) => {
        if (![LinkVisible.HOMEPAGE, LinkVisible.SITE].includes(v)) {
          throw new BadRequestException(Message.ILLEGAL_PARAM);
        }
      });
    } else {
      visible = isHome === '1' || isHome === 'true' ? [LinkVisible.HOMEPAGE, LinkVisible.SITE] : LinkVisible.SITE;
    }
    const links = await this.linkService.getFriendLinks(<LinkVisible | LinkVisible[]> visible);
    return getSuccessResponse(links);
  }

  @Get('api/links')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async getLinks(
    @Param('page', new ParseIntPipe(1)) page: number,
    @Param('pageSize', new ParseIntPipe(10)) pageSize: number,
    @Query('visible', new TrimPipe()) visible: LinkVisible | LinkVisible[],
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('orders', new TrimPipe()) orders: string[],
  ) {
    if (visible) {
      visible = Array.isArray(visible) ? visible : <LinkVisible[]>visible.split(',') || [];
      const allowed = Object.keys(LinkVisible).map((key) => LinkVisible[key]);
      (visible as LinkVisible[]).forEach((v: LinkVisible) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(Message.ILLEGAL_PARAM);
        }
      });
    }
    const param: LinkQueryParam = {
      page,
      pageSize,
      visible,
      keyword
    };
    if (orders.length > 0) {
      param.orders = getQueryOrders({
        linkOrder: 1,
        created: 2
      }, orders);
    }
    const links = await this.linkService.getLinks(param);
    return getSuccessResponse(links);
  }

  @Get(['admin/link', 'admin/link/page-:page'])
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Render('admin/pages/link-list')
  async showLinks(
    @Req() req: Request,
    @Param('page', new ParseIntPipe(1)) page: number,
    @Search() search: string
  ) {
    const linkList = await this.linkService.getLinks({ page });
    const { links, total } = linkList;
    const options = await this.optionsService.getOptions();
    const titles = ['链接列表', '管理后台', options.site_name];
    page = linkList.page;
    page > 1 && titles.unshift(`第${page}页`);

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name}管理后台`,
        author: options.site_author
      },
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, total),
        linkUrl: '/admin/link/page-',
        linkParam: search
      },
      curNav: 'taxonomy-link',
      // token: req.csrfToken(),
      options,
      links
    };
  }

  @Get('admin/link/detail')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(CheckIdInterceptor)
  @Render('admin/pages/link-form')
  @IdParams({ idInQuery: ['id'] })
  async editLink(
    @Req() req: Request,
    @Query('id', new TrimPipe()) linkId: string,
    @Query('action', new TrimPipe(), new LowerCasePipe()) action: string,
    @Referer() referer: string,
    @Session() session: any
  ) {
    if (!['create', 'edit'].includes(action)) {
      throw new CustomException('操作不允许。', HttpStatus.FORBIDDEN, ResponseCode.FORBIDDEN);
    }
    let link = { taxonomies: [{}] };
    if (action === 'edit') {
      link = await this.linkService.getLinkById(linkId);
      if (!link) {
        throw new CustomException('链接不存在。', HttpStatus.NOT_FOUND, ResponseCode.LINK_NOT_FOUND);
      }
    }
    const { taxonomies } = await this.taxonomiesService.getTaxonomies({
      status: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE],
      type: TaxonomyType.LINK,
      pageSize: 0
    });

    const options = await this.optionsService.getOptions();
    const titles = ['管理后台', options.site_name];
    let title = '';
    if (action === 'create') {
      title = '新增链接';
      titles.unshift(title);
    } else {
      title = '编辑链接';
      titles.unshift(link['linkName'], title);
    }
    session.linkReferer = referer;

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name}管理后台`,
        author: options.site_author
      },
      // token: req.csrfToken(),
      curNav: 'taxonomy-link',
      title,
      link,
      options,
      taxonomyList: taxonomies
    };
  }

  @Post('admin/link/save')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveLink(
    @Req() req: Request,
    @Body(new TrimPipe()) linkDto: LinkDto,
    @Session() session: any
  ) {
    linkDto = {
      linkId: linkDto.linkId,
      linkName: xss.sanitize(linkDto.linkName),
      linkUrl: xss.sanitize(linkDto.linkUrl),
      linkDescription: xss.sanitize(linkDto.linkDescription),
      linkVisible: linkDto.linkVisible,
      linkTarget: linkDto.linkTarget,
      linkOrder: linkDto.linkOrder,
      linkTaxonomy: linkDto.linkTaxonomy
    };
    const result = await this.linkService.saveLink(linkDto);
    if (!result) {
      throw new CustomException('保存失败。', HttpStatus.OK, ResponseCode.LINK_SAVE_ERROR);
    }
    const referer = session.linkReferer;
    delete session.linkReferer;

    return {
      code: ResponseCode.SUCCESS,
      data: {
        url: referer || '/admin/link'
      }
    };
  }

  @Post('admin/link/remove')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async removeLinks(
    @Req() req: Request,
    @Body(new TrimPipe()) removeLinkDto: RemoveLinkDto,
    @Referer() referer: string
  ) {
    const result = await this.linkService.removeLinks(removeLinkDto.linkIds);
    if (!result) {
      throw new CustomException('删除失败。', HttpStatus.OK, ResponseCode.LINK_REMOVE_ERROR);
    }

    return {
      code: 0,
      data: {
        url: referer || '/admin/link'
      }
    };
  }
}
