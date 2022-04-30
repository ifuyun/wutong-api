import { Body, Controller, Delete, Get, Header, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import * as xss from 'sanitizer';
import { LinkScope, LinkStatus, LinkTarget, Role, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { IdParams } from '../../decorators/id-params.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { LinkDto, RemoveLinkDto } from '../../dtos/link.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { format } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { LinkQueryParam } from './link.interface';
import { LinkService } from './link.service';

@Controller('api/links')
export class LinkController {
  constructor(
    private readonly linkService: LinkService,
    private readonly taxonomyService: TaxonomyService
  ) {
  }

  @Get('friend')
  @Header('Content-Type', 'application/json')
  async getFriendLinks(
    @Query('scope') scope: LinkScope | LinkScope[],
    @Query('isHome') isHome: string
  ) {
    if (scope) {
      scope = Array.isArray(scope) ? scope : [scope];
      (scope as LinkScope[]).forEach((v: LinkScope) => {
        if (![LinkScope.HOMEPAGE, LinkScope.SITE].includes(v)) {
          throw new BadRequestException(format(Message.PARAM_INVALID, 'scope'));
        }
      });
    } else {
      scope = isHome === '1' || isHome === 'true' ? [LinkScope.HOMEPAGE, LinkScope.SITE] : LinkScope.SITE;
    }
    const links = await this.linkService.getFriendLinks(scope);
    return getSuccessResponse(links);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['taxonomyId'] })
  @Header('Content-Type', 'application/json')
  async getLinks(
    @Param('page', new ParseIntPipe(1)) page: number,
    @Param('pageSize', new ParseIntPipe(10)) pageSize: number,
    @Query('scope', new TrimPipe()) scope: LinkScope | LinkScope[],
    @Query('status', new TrimPipe()) status: LinkStatus | LinkStatus[],
    @Query('target', new TrimPipe()) target: LinkTarget | LinkTarget[],
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('taxonomyId', new TrimPipe()) taxonomyId: string,
    @Query('orders', new TrimPipe()) orders: string[]
  ) {
    if (scope) {
      scope = Array.isArray(scope) ? scope : [scope];
      const allowed = Object.keys(LinkScope).map((key) => LinkScope[key]);
      scope.forEach((v: LinkScope) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(format(Message.PARAM_INVALID, 'scope'));
        }
      });
    }
    if (target) {
      target = Array.isArray(target) ? target : [target];
      const allowed = Object.keys(LinkTarget).map((key) => LinkTarget[key]);
      target.forEach((v: LinkTarget) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(format(Message.PARAM_INVALID, 'target'));
        }
      });
    }
    if (status) {
      status = Array.isArray(status) ? status : [status];
      const allowed = Object.keys(LinkStatus).map((key) => LinkStatus[key]);
      status.forEach((v: LinkStatus) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(format(Message.PARAM_INVALID, 'status'));
        }
      });
    }
    const param: LinkQueryParam = {
      page,
      pageSize,
      scope,
      status,
      target,
      keyword,
      taxonomyId
    };
    if (orders.length > 0) {
      param.orders = getQueryOrders({
        linkRating: 1,
        linkModified: 2,
        linkCreated: 3
      }, orders);
    }
    const links = await this.linkService.getLinks(param);
    return getSuccessResponse(links);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveLink(
    @Body(new TrimPipe()) linkDto: LinkDto
  ) {
    if (linkDto.linkId) {
      const link = await this.linkService.getLinkById(linkDto.linkId);
      if (!link || !link.linkId) {
        throw new BadRequestException(Message.LINK_NOT_EXIST);
      }
      if (link && link.linkStatus !== LinkStatus.TRASH && linkDto.linkStatus === LinkStatus.TRASH) {
        throw new BadRequestException(Message.LINK_SAVE_DISALLOW_DELETE);
      }
    }
    linkDto = {
      linkId: linkDto.linkId,
      linkName: xss.sanitize(linkDto.linkName),
      linkUrl: xss.sanitize(linkDto.linkUrl),
      linkDescription: xss.sanitize(linkDto.linkDescription),
      linkScope: linkDto.linkScope,
      linkStatus: linkDto.linkStatus,
      linkTarget: linkDto.linkTarget,
      linkRating: linkDto.linkRating,
      linkTaxonomy: linkDto.linkTaxonomy
    };
    await this.linkService.saveLink(linkDto);

    return getSuccessResponse();
  }

  @Delete()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async removeLinks(
    @Body(new TrimPipe()) removeLinkDto: RemoveLinkDto
  ) {
    await this.linkService.removeLinks(removeLinkDto.linkIds);
    await this.taxonomyService.updateAllCount([TaxonomyType.LINK]);

    return getSuccessResponse();
  }
}
