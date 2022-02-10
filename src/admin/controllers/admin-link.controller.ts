import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import * as xss from 'sanitizer';
import { Role } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-codes.enum';
import IdParams from '../../decorators/id-params.decorator';
import Referer from '../../decorators/referer.decorator';
import Roles from '../../decorators/roles.decorator';
import Search from '../../decorators/search.decorator';
import { LinkDto, RemoveLinkDto } from '../../dtos/link.dto';
import CustomException from '../../exceptions/custom.exception';
import RolesGuard from '../../guards/roles.guard';
import CheckIdInterceptor from '../../interceptors/check-id.interceptor';
import LowerCasePipe from '../../pipes/lower-case.pipe';
import ParseIntPipe from '../../pipes/parse-int.pipe';
import TrimPipe from '../../pipes/trim.pipe';
import LinksService from '../../services/links.service';
import OptionsService from '../../services/options.service';
import PaginatorService from '../../services/paginator.service';
import TaxonomiesService from '../../services/taxonomies.service';
import UtilService from '../../services/util.service';

@Controller('admin/link')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export default class AdminLinkController {
  constructor(
    private readonly linkService: LinksService,
    private readonly optionsService: OptionsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService
  ) {
  }

  @Get(['', 'page-:page'])
  @Render('admin/pages/link-list')
  async showLinks(
    @Req() req,
    @Param('page', new ParseIntPipe(1)) page,
    @Search() search
  ) {
    const linkList = await this.linkService.getLinksByPage(page);
    const { links, count } = linkList;
    const options = await this.optionsService.getOptions();
    const titles = ['链接列表', '管理后台', options.site_name.value];
    page = linkList.page;
    page > 1 && titles.unshift(`第${page}页`);

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
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

  @Get('detail')
  @Render('admin/pages/link-form')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['id'] })
  async editLink(
    @Req() req,
    @Query('id', new TrimPipe()) linkId,
    @Query('action', new TrimPipe(), new LowerCasePipe()) action,
    @Referer() referer,
    @Session() session
  ) {
    if (!['create', 'edit'].includes(action)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.FORBIDDEN, '操作不允许。');
    }
    let link = { taxonomies: [{}] };
    if (action === 'edit') {
      link = await this.linkService.getLinkById(linkId);
      if (!link) {
        throw new CustomException(ResponseCode.LINK_NOT_FOUND, HttpStatus.NOT_FOUND, '链接不存在。');
      }
    }
    const taxonomyData = await this.taxonomiesService.getAllTaxonomies([], 'link');
    const taxonomies = this.taxonomiesService.getTaxonomyTree(taxonomyData);

    const options = await this.optionsService.getOptions();
    const titles = ['管理后台', options.site_name.value];
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
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      token: req.csrfToken(),
      curNav: 'taxonomy-link',
      title,
      link,
      options,
      taxonomyList: taxonomies.taxonomyList
    };
  }

  @Post('save')
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
      throw new CustomException(ResponseCode.LINK_SAVE_ERROR, HttpStatus.OK, '保存失败。');
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

  @Post('remove')
  async removeLinks(
    @Req() req,
    @Body(new TrimPipe()) removeLinkDto: RemoveLinkDto,
    @Referer() referer
  ) {
    const result = await this.linkService.removeLinks(removeLinkDto.linkIds);
    if (!result) {
      throw new CustomException(ResponseCode.LINK_REMOVE_ERROR, HttpStatus.OK, '删除失败。');
    }

    return {
      code: 0,
      data: {
        url: referer || '/admin/link'
      }
    };
  }
}
