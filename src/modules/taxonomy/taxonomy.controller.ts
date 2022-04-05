import { Body, Controller, Delete, Get, Header, Post, Query, Req, Session, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import * as xss from 'sanitizer';
import { Role, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { TaxonomyDto, TaxonomyRemoveDto } from '../../dtos/taxonomy.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { UnknownException } from '../../exceptions/unknown.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { format } from '../../helpers/helper';
import { AuthUserEntity } from '../../interfaces/auth.interface';
import { TaxonomyQueryParam } from '../../interfaces/taxonomies.interface';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { TaxonomiesService } from './taxonomies.service';

@Controller('api/taxonomies')
export class TaxonomyController {
  constructor(
    private readonly taxonomiesService: TaxonomiesService
  ) {
  }

  @Get('taxonomy-tree')
  @Header('Content-Type', 'application/json')
  async getTaxonomyTree(@AuthUser() user: AuthUserEntity) {
    const { taxonomies } = await this.taxonomiesService.getTaxonomies({
      status: user.isAdmin ? [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE] : TaxonomyStatus.PUBLISH,
      type: TaxonomyType.POST,
      pageSize: 0
    });
    const taxonomyTree = this.taxonomiesService.generateTaxonomyTree(taxonomies);

    return getSuccessResponse(taxonomyTree);
  }

  @Get()
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
      status = Array.isArray(status) ? status : [status];
      const allowedStatuses = Object.keys(TaxonomyStatus).map((key) => TaxonomyStatus[key]);
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
        count: 1,
        termOrder: 2
      }, orders);
    }

    const taxonomies = await this.taxonomiesService.getTaxonomies(param);
    return getSuccessResponse(taxonomies);
  }

  @Get('tags')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async searchTags(
    @Query('keyword', new TrimPipe()) keyword: string
  ) {
    if (!keyword) {
      throw new BadRequestException(Message.MISSED_PARAMS);
    }
    const tags = await this.taxonomiesService.searchTags(keyword);
    const tagList: string[] = tags.map((item) => item.name);

    return getSuccessResponse(tagList);
  }

  @Post('update-count')
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

  @Post()
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
      parentId: taxonomyDto.parentId,
      termOrder: taxonomyDto.termOrder,
      status: taxonomyDto.status,
      type
    };
    if (type === TaxonomyType.TAG) {
      taxonomyDto.slug = taxonomyDto.description = taxonomyDto.name;
      taxonomyDto.parentId = '';
    }
    let taxonomy: TaxonomyModel;
    if (taxonomyDto.taxonomyId) {
      taxonomy = await this.taxonomiesService.getTaxonomyById(taxonomyDto.taxonomyId);
      // if is_required is 1, then can not modify parentId
      if (taxonomy.isRequired === 1 && taxonomyDto.parentId !== taxonomy.parentId) {
        throw new BadRequestException(Message.TAXONOMY_CAN_NOT_MODIFY_PARENT);
      }
    }
    if (taxonomyDto.parentId) {
      const parentTaxonomy = await this.taxonomiesService.getTaxonomyById(taxonomyDto.parentId);
      // disallow create when parent is TRASH
      if (parentTaxonomy.status === TaxonomyStatus.TRASH && !taxonomyDto.taxonomyId) {
        throw new BadRequestException(Message.TAXONOMY_CAN_NOT_ADD_CHILD);
      }
    }
    const result = await this.taxonomiesService.saveTaxonomy(taxonomyDto);
    if (!result) {
      throw new UnknownException(
        <Message>format(Message.TAXONOMY_SAVE_ERROR, taxonomyDto.type === TaxonomyType.TAG ? '标签' : '分类'),
        ResponseCode.POST_SAVE_ERROR
      );
    }

    return getSuccessResponse();
  }

  @Delete()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async removeTaxonomies(
    @Req() req: Request,
    @Body(new TrimPipe()) removeDto: TaxonomyRemoveDto
  ) {
    const { type, taxonomyIds } = removeDto;
    const taxonomies = (await this.taxonomiesService.getTaxonomiesByIds(taxonomyIds, true));
    if (taxonomies.length > 0) {
      throw new BadRequestException(
        <Message>format(Message.TAXONOMY_CAN_NOT_BE_DELETED, taxonomies.map((item) => item.name).join(', '))
      );
    }
    const { success, message } = await this.taxonomiesService.removeTaxonomies(type, taxonomyIds);
    if (!success) {
      if (message) {
        throw new BadRequestException(message);
      }
      throw new UnknownException(<Message>format(Message.TAXONOMY_DELETE_ERROR, type === TaxonomyType.TAG ? '标签' : '分类'));
    }

    return getSuccessResponse();
  }
}
