import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpStatus,
  Param,
  Post,
  Query,
  Render,
  Req,
  Session,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { Request } from 'express';
import * as xss from 'sanitizer';
import { LinkStatus, LinkTarget, LinkScope, Role, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { IdParams } from '../../decorators/id-params.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
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
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { UtilService } from '../util/util.service';
import { LinksService } from './links.service';

@Controller('api/links')
export class LinkController {
  constructor(
    private readonly linkService: LinksService,
    private readonly optionsService: OptionsService,
    private readonly taxonomyService: TaxonomyService,
    private readonly utilService: UtilService
  ) {
  }

  @Get('tool')
  @Header('Content-Type', 'application/json')
  async getToolLinks() {
    const links = await this.linkService.getToolLinks();
    return getSuccessResponse(links);
  }

  @Get('friend')
  @Header('Content-Type', 'application/json')
  async getFriendLinks(
    @Query('scope') scope: string | string[],
    @Query('isHome') isHome: string
  ) {
    if (scope) {
      scope = Array.isArray(scope) ? scope : scope.split(',') || [];
      (scope as LinkScope[]).forEach((v: LinkScope) => {
        if (![LinkScope.HOMEPAGE, LinkScope.SITE].includes(v)) {
          throw new BadRequestException(Message.ILLEGAL_PARAM);
        }
      });
    } else {
      scope = isHome === '1' || isHome === 'true' ? [LinkScope.HOMEPAGE, LinkScope.SITE] : LinkScope.SITE;
    }
    const links = await this.linkService.getFriendLinks(<LinkScope | LinkScope[]> scope);
    return getSuccessResponse(links);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async getLinks(
    @Param('page', new ParseIntPipe(1)) page: number,
    @Param('pageSize', new ParseIntPipe(10)) pageSize: number,
    @Query('scope', new TrimPipe()) scope: LinkScope | LinkScope[],
    @Query('status', new TrimPipe()) status: LinkStatus | LinkStatus[],
    @Query('target', new TrimPipe()) target: LinkTarget | LinkTarget[],
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('orders', new TrimPipe()) orders: string[],
  ) {
    if (scope) {
      scope = Array.isArray(scope) ? scope : [scope];
      const allowed = Object.keys(LinkScope).map((key) => LinkScope[key]);
      scope.forEach((v: LinkScope) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(Message.ILLEGAL_PARAM);
        }
      });
    }
    if (target) {
      target = Array.isArray(target) ? target : [target];
      const allowed = Object.keys(LinkTarget).map((key) => LinkTarget[key]);
      target.forEach((v: LinkTarget) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(Message.ILLEGAL_PARAM);
        }
      });
    }
    if (status) {
      status = Array.isArray(status) ? status : [status];
      const allowed = Object.keys(LinkStatus).map((key) => LinkStatus[key]);
      status.forEach((v: LinkStatus) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(Message.ILLEGAL_PARAM);
        }
      });
    }
    const param: LinkQueryParam = {
      page,
      pageSize,
      scope,
      status,
      target,
      keyword
    };
    if (orders.length > 0) {
      param.orders = getQueryOrders({
        linkOrder: 1,
        modified: 2,
        created: 3
      }, orders);
    }
    const links = await this.linkService.getLinks(param);
    return getSuccessResponse(links);
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
    const { taxonomies } = await this.taxonomyService.getTaxonomies({
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

  @Post()
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
      linkScope: linkDto.linkScope,
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

  @Delete()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
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
