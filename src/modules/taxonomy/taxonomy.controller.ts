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
import { AuthUserEntity } from '../auth/auth.interface';
import { TaxonomyQueryParam } from './taxonomy.interface';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { TaxonomyService } from './taxonomy.service';

@Controller('api/taxonomies')
export class TaxonomyController {
  constructor(
    private readonly taxonomyService: TaxonomyService
  ) {
  }

  @Get('taxonomy-tree')
  @Header('Content-Type', 'application/json')
  async getTaxonomyTree(@AuthUser() user: AuthUserEntity) {
    const { taxonomies } = await this.taxonomyService.getTaxonomies({
      status: user.isAdmin ? [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE] : TaxonomyStatus.PUBLISH,
      type: TaxonomyType.POST,
      pageSize: 0
    });
    const taxonomyTree = this.taxonomyService.generateTaxonomyTree(taxonomies);

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
      throw new BadRequestException(<Message>format(Message.PARAM_INVALID, type), ResponseCode.TAXONOMY_TYPE_INVALID);
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
            <Message>format(Message.PARAM_INVALID, JSON.stringify(status)),
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

    const taxonomies = await this.taxonomyService.getTaxonomies(param);
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
      throw new BadRequestException(Message.PARAM_MISSED);
    }
    const tags = await this.taxonomyService.searchTags(keyword);
    const tagList: string[] = tags.map((item) => item.name);

    return getSuccessResponse(tagList);
  }

  @Post('update-count')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async updateCount(@Body(new TrimPipe()) body: { type: TaxonomyType }) {
    if (body.type && ![TaxonomyType.POST, TaxonomyType.TAG, TaxonomyType.LINK].includes(body.type)) {
      return new BadRequestException(Message.PARAM_ILLEGAL);
    }
    await this.taxonomyService.updateAllCount(body.type);

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
    taxonomyDto = {
      taxonomyId: taxonomyDto.taxonomyId,
      name: xss.sanitize(taxonomyDto.name),
      slug: xss.sanitize(taxonomyDto.slug),
      description: xss.sanitize(taxonomyDto.description),
      parentId: taxonomyDto.parentId,
      termOrder: taxonomyDto.termOrder,
      status: taxonomyDto.status,
      type: taxonomyDto.type
    };
    if (taxonomyDto.type === TaxonomyType.TAG) {
      taxonomyDto.slug = taxonomyDto.description = taxonomyDto.name;
      taxonomyDto.parentId = '';
    }
    let taxonomy: TaxonomyModel;
    if (taxonomyDto.taxonomyId) {
      taxonomy = await this.taxonomyService.getTaxonomyById(taxonomyDto.taxonomyId);
      /* if is_required is 1, then can not modify parentId */
      if (taxonomy.isRequired === 1 && taxonomyDto.parentId !== taxonomy.parentId) {
        throw new BadRequestException(Message.TAXONOMY_REQUIRED_CAN_NOT_MODIFY_PARENT);
      }
    }
    if (taxonomyDto.parentId) {
      const parentTaxonomy = await this.taxonomyService.getTaxonomyById(taxonomyDto.parentId);
      /* disallow create when parent is TRASH */
      if (parentTaxonomy.status === TaxonomyStatus.TRASH && !taxonomyDto.taxonomyId) {
        throw new BadRequestException(Message.TAXONOMY_CAN_NOT_ADD_CHILD);
      }
      /*
       * if the parent's status is not PUBLISH, create is disallowed;
       * if the parent is changed and its status is not PUBLISH, it is disallowed
       */
      if (
        parentTaxonomy.status !== TaxonomyStatus.PUBLISH &&
        (!taxonomy || taxonomy && taxonomyDto.parentId !== taxonomy.parentId)
      ) {
        throw new BadRequestException(Message.TAXONOMY_NOT_PUBLISH_CAN_NOT_MODIFY_PARENT);
      }
    }
    const result = await this.taxonomyService.saveTaxonomy(taxonomyDto);
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
    const taxonomies = (await this.taxonomyService.getTaxonomiesByIds(taxonomyIds, true));
    if (taxonomies.length > 0) {
      throw new BadRequestException(
        <Message>format(Message.TAXONOMY_REQUIRED_CAN_NOT_BE_DELETED, taxonomies.map((item) => item.name).join(', '))
      );
    }
    const { success, message } = await this.taxonomyService.removeTaxonomies(type, taxonomyIds);
    if (!success) {
      if (message) {
        throw new BadRequestException(message);
      }
      throw new UnknownException(<Message>format(Message.TAXONOMY_DELETE_ERROR, type === TaxonomyType.TAG ? '标签' : '分类'));
    }

    return getSuccessResponse();
  }
}
