import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { LinkStatus, LinkScope, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { LinkDto } from '../../dtos/link.dto';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { format, generateId } from '../../helpers/helper';
import { LinkListVo, LinkQueryParam } from './link.interface';
import { LinkModel } from '../../models/link.model';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { LoggerService } from '../logger/logger.service';
import { OptionService } from '../option/option.service';

@Injectable()
export class LinkService {
  constructor(
    @InjectModel(LinkModel)
    private readonly linkModel: typeof LinkModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    @InjectModel(TaxonomyModel)
    private readonly taxonomyModel: typeof TaxonomyModel,
    private readonly optionService: OptionService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
  }

  async getLinksByTaxonomy(taxonomyId: string, visible?: LinkScope | LinkScope[]): Promise<LinkModel[]> {
    const where: WhereOptions = {
      linkStatus: LinkStatus.NORMAL
    };
    if (visible) {
      where['linkScope'] = visible;
    }
    return this.linkModel.findAll({
      attributes: ['linkName', 'linkUrl', 'linkDescription', 'linkTarget'],
      include: [{
        model: TaxonomyModel,
        through: { attributes: [] },
        attributes: [],
        where: {
          taxonomyId: {
            [Op.eq]: taxonomyId
          },
          taxonomyType: {
            [Op.eq]: TaxonomyType.LINK
          }
        }
      }],
      where,
      order: [
        ['linkRating', 'desc']
      ]
    }).catch((e) => {
      this.logger.error({
        message: e.message || '链接查询失败',
        data: { taxonomyId, visible },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getFriendLinks(visible: LinkScope | LinkScope[]): Promise<LinkModel[]> {
    const friendOption = await this.optionService.getOptionByKey('friend_link_category');
    if (!friendOption.optionValue) {
      throw new InternalServerErrorException(
        format(Message.OPTION_VALUE_MISSED, 'friend_link_category'), ResponseCode.OPTIONS_MISSED
      );
    }
    return this.getLinksByTaxonomy(friendOption.optionValue, visible);
  }

  async getLinks(param: LinkQueryParam): Promise<LinkListVo> {
    const { scope, status, target, keyword, taxonomyId, orders } = param;
    const pageSize = param.pageSize || 10;
    const where = {};
    if (scope && scope.length > 0) {
      where['linkScope'] = scope;
    }
    if (status && status.length > 0) {
      where['linkStatus'] = status;
    }
    if (target && target.length > 0) {
      where['linkTarget'] = target;
    }
    if (keyword) {
      where[Op.or] = [{
        linkName: {
          [Op.like]: `%${keyword}%`
        }
      }, {
        linkDescription: {
          [Op.like]: `%${keyword}%`
        }
      }];
    }
    const includeWhere: WhereOptions = {
      taxonomyType: {
        [Op.eq]: TaxonomyType.LINK
      }
    };
    if (taxonomyId) {
      includeWhere['taxonomyId'] = taxonomyId;
    }
    const includeOpt: IncludeOptions[] = [{
      model: TaxonomyModel,
      through: { attributes: [] },
      where: includeWhere,
      required: !!taxonomyId
    }];
    const queryOpt: FindOptions = {
      where,
      include: includeOpt,
      order: orders || [['linkRating', 'desc']],
      limit: pageSize
    };

    try {
      const total = await this.linkModel.count({ where });
      const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);
      queryOpt.offset = pageSize * (page - 1);

      /* findAndCountAll无法判断page大于最大页数的情况 */
      const links = await this.linkModel.findAll(queryOpt);

      return { links, page, total };
    } catch (e) {
      this.logger.error({
        message: e.message || '链接查询失败',
        data: param,
        stack: e.stack
      });
      throw new DbQueryErrorException();
    }
  }

  async getLinkById(linkId: string): Promise<LinkModel> {
    return this.linkModel.findByPk(linkId, {
      include: [{
        model: TaxonomyModel,
        through: { attributes: [] },
        where: {
          taxonomyType: {
            [Op.eq]: TaxonomyType.LINK
          }
        },
        required: false
      }]
    }).catch((e) => {
      this.logger.error({
        message: e.message || '链接查询失败',
        data: { linkId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async saveLink(linkDto: LinkDto): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      if (!linkDto.linkId) {
        linkDto.linkId = generateId();
        await this.linkModel.create({ ...linkDto }, { transaction: t });
        await this.taxonomyModel.increment({ count: 1 }, {
          where: {
            taxonomyId: linkDto.linkTaxonomy
          },
          transaction: t
        });
      } else {
        await this.taxonomyRelationshipModel.destroy({
          where: {
            objectId: {
              [Op.eq]: linkDto.linkId
            }
          },
          transaction: t
        });
        await this.linkModel.update({ ...linkDto }, {
          where: {
            linkId: {
              [Op.eq]: linkDto.linkId
            }
          },
          transaction: t
        });
        const link = await this.getLinkById(linkDto.linkId);
        const previousTaxonomy = link.taxonomies && link.taxonomies[0] && link.taxonomies[0].taxonomyId;
        if (previousTaxonomy && linkDto.linkTaxonomy !== previousTaxonomy) {
          await this.taxonomyModel.decrement({ count: 1 }, {
            where: {
              taxonomyId: previousTaxonomy
            },
            transaction: t
          });
        }
        if (!previousTaxonomy || linkDto.linkTaxonomy !== previousTaxonomy) {
          await this.taxonomyModel.increment({ count: 1 }, {
            where: {
              taxonomyId: linkDto.linkTaxonomy
            },
            transaction: t
          });
        }
      }
      await this.taxonomyRelationshipModel.create({
        objectId: linkDto.linkId,
        taxonomyId: linkDto.linkTaxonomy
      }, {
        transaction: t
      });
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '链接保存失败。',
        data: linkDto,
        stack: e.stack
      });
      throw new DbQueryErrorException(Message.LINK_SAVE_ERROR);
    });
  }

  async removeLinks(linkIds: string[]): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      await this.linkModel.update({
        linkStatus: LinkStatus.TRASH
      }, {
        where: {
          linkId: {
            [Op.in]: linkIds
          }
        },
        transaction: t
      });
      await this.taxonomyRelationshipModel.destroy({
        where: {
          objectId: {
            [Op.in]: linkIds
          }
        },
        transaction: t
      });
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '链接删除失败',
        data: { linkIds },
        stack: e.stack
      });
      throw new DbQueryErrorException(Message.LINK_DELETE_ERROR, ResponseCode.LINK_DELETE_ERROR);
    });
  }
}
