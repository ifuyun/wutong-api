import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import * as xss from 'sanitizer';
import { LinksService } from './links.service';
import { OptionsService } from '../option/options.service';
import { PaginatorService } from '../paginator/paginator.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { UtilService } from '../util/util.service';
import { Role } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { IdParams } from '../../decorators/id-params.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { Search } from '../../decorators/search.decorator';
import { LinkDto, RemoveLinkDto } from '../../dtos/link.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getSuccessResponse } from '../../transformers/response.transformers';

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

  @Get(['admin/link', 'admin/link/page-:page'])
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Render('admin/pages/link-list')
  async showLinks(
    @Req() req,
    @Param('page', new ParseIntPipe(1)) page,
    @Search() search
  ) {
    const linkList = await this.linkService.getLinksByPage(page);
    const { links, count } = linkList;
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
        paginator: this.paginatorService.getPaginator(page, count),
        linkUrl: '/admin/link/page-',
        linkParam: search
      },
      curNav: 'taxonomy-link',
      token: req.csrfToken(),
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
    @Req() req,
    @Query('id', new TrimPipe()) linkId,
    @Query('action', new TrimPipe(), new LowerCasePipe()) action,
    @Referer() referer,
    @Session() session
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
    const taxonomyData = await this.taxonomiesService.getAllTaxonomies([0 ,1], 'link');
    const taxonomies = this.taxonomiesService.getTaxonomyTree(taxonomyData);

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
      token: req.csrfToken(),
      curNav: 'taxonomy-link',
      title,
      link,
      options,
      taxonomyList: taxonomies.taxonomyList
    };
  }

  @Post('admin/link/save')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveLink(
    @Req() req,
    @Body(new TrimPipe()) linkDto: LinkDto,
    @Session() session
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
    @Req() req,
    @Body(new TrimPipe()) removeLinkDto: RemoveLinkDto,
    @Referer() referer
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
