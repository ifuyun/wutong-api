import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseInterceptors } from '@nestjs/common';
import * as xss from 'sanitizer';
import { ID_REG } from '../../common/constants';
import { LinkTarget, LinkVisibleScope, ResponseCode } from '../../common/common.enum';
import IdParams  from '../../decorators/id-params.decorator';
import Referer from '../../decorators/referer.decorator';
import Search from '../../decorators/search.decorator';
import LinkDto from '../../dtos/link.dto';
import CustomException from '../../exceptions/custom.exception';
import CheckIdInterceptor from '../../interceptors/check-id.interceptor';
import ParseIntPipe from '../../pipes/parse-int.pipe';
import TrimPipe from '../../pipes/trim.pipe';
import LinksService from '../../services/links.service';
import OptionsService from '../../services/options.service';
import PaginatorService from '../../services/paginator.service';
import TaxonomiesService from '../../services/taxonomies.service';
import UtilService from '../../services/util.service';
import ExceptionFactory from '../../validators/exception-factory';
import LowerCasePipe from '../../pipes/lower-case.pipe';

@Controller('admin/link')
export default class AdminLinkController {
  constructor(
    private readonly linkService: LinksService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly optionsService: OptionsService,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService
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
    if (!Object.keys(LinkVisibleScope).map((k) => LinkVisibleScope[k]).includes(linkDto.linkVisible)) {
      throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.OK, '请选择正确的可见性。');
    }
    if (!Object.keys(LinkTarget).map((k) => LinkTarget[k]).includes(linkDto.linkTarget)) {
      throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.OK, '请选择正确的打开方式。');
    }
    linkDto = {
      linkId: xss.sanitize(linkDto.linkId),
      linkTaxonomy: xss.sanitize(linkDto.linkTaxonomy),
      linkUrl: xss.sanitize(linkDto.linkUrl),
      linkName: xss.sanitize(linkDto.linkName),
      linkDescription: xss.sanitize(linkDto.linkDescription),
      linkTarget: linkDto.linkTarget,
      linkVisible: linkDto.linkVisible,
      linkOrder: linkDto.linkOrder
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
    @Body(new TrimPipe()) data,
    @Referer() referer
  ) {
    // todo: ParseArrayPipe
    let linkIds: string[] = [];
    if (typeof data.linkIds === 'string') {
      linkIds = data.linkIds.split(',');
    } else if (Array.isArray(data.linkIds)) {
      linkIds = data.linkIds;
    }
    if (linkIds.length < 1) {
      throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.OK, '请选择要删除的链接。');
    }
    linkIds.forEach((id) => {
      if (!ID_REG.test(id)) {
        throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.OK, '请求参数错误');
      }
    });
    const result = await this.linkService.removeLinks(linkIds);
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
