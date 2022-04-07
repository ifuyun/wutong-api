import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { LinkStatus, LinkScope, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { LinkDto } from '../../dtos/link.dto';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { getUuid } from '../../helpers/helper';
import { LinkListVo, LinkQueryParam } from '../../interfaces/links.interface';
import { LinkModel } from '../../models/link.model';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { LoggerService } from '../logger/logger.service';
import { OptionsService } from '../option/options.service';

@Injectable()
export class LinkService {
  constructor(
    @InjectModel(LinkModel)
    private readonly linkModel: typeof LinkModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    @InjectModel(TaxonomyModel)
    private readonly taxonomyModel: typeof TaxonomyModel,
    private readonly optionsService: OptionsService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
    this.logger.setLogger(this.logger.sysLogger);
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
        attributes: ['created', 'modified'],
        where: {
          taxonomyId: {
            [Op.eq]: taxonomyId
          },
          type: {
            [Op.eq]: TaxonomyType.LINK
          }
        }
      }],
      where,
      order: [
        ['linkOrder', 'desc']
      ]
    });
  }

  async getFriendLinks(visible: LinkScope | LinkScope[]): Promise<LinkModel[]> {
    const friendOption = await this.optionsService.getOptionByKey('friend_link_taxonomy_id');
    if (!friendOption || !friendOption.optionValue) {
      throw new InternalServerErrorException(Message.OPTION_MISSED);
    }
    return this.getLinksByTaxonomy(friendOption.optionValue, visible);
  }

  async getToolLinks(): Promise<LinkModel[]> {
    const toolOption = await this.optionsService.getOptionByKey('tool_link_taxonomy_id');
    if (!toolOption || !toolOption.optionValue) {
      throw new InternalServerErrorException(Message.OPTION_MISSED);
    }
    return this.getLinksByTaxonomy(toolOption.optionValue);
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
      type: {
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
      order: orders || [['linkOrder', 'desc']],
      limit: pageSize
    };

    const total = await this.linkModel.count({ where });
    const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);
    queryOpt.offset = pageSize * (page - 1);

    /* findAndCountAll无法判断page大于最大页数的情况 */
    const links = await this.linkModel.findAll(queryOpt);

    return { links, page, total };
  }

  async getLinkById(linkId: string): Promise<LinkModel> {
    return this.linkModel.findByPk(linkId, {
      include: [{
        model: TaxonomyModel,
        through: { attributes: [] },
        where: {
          type: {
            [Op.eq]: TaxonomyType.LINK
          }
        },
        required: false
      }]
    });
  }

  async saveLink(linkDto: LinkDto): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      if (!linkDto.linkId) {
        linkDto.linkId = getUuid();
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
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '链接保存失败。',
        data: linkDto,
        stack: err.stack
      });
      return Promise.resolve(false);
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
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '链接删除失败。',
        data: linkIds,
        stack: err.stack
      });
      return Promise.resolve(false);
    });
  }
}
