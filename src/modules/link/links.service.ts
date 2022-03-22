import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { LoggerService } from '../logger/logger.service';
import { PaginatorService } from '../paginator/paginator.service';
import { CommentStatus, LinkTarget, LinkTargetDesc, LinkVisible, LinkVisibleDesc, TaxonomyType } from '../../common/common.enum';
import { LinkDto } from '../../dtos/link.dto';
import { getEnumKeyByValue, getUuid } from '../../helpers/helper';
import { LinkListVo, LinkQueryParam } from '../../interfaces/links.interface';
import { LinkModel } from '../../models/link.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';

@Injectable()
export class LinksService {
  constructor(
    @InjectModel(LinkModel)
    private readonly linkModel: typeof LinkModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    private readonly paginatorService: PaginatorService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  async getLinksByType(param: { slug: string, visible: LinkVisible | LinkVisible[] }): Promise<LinkModel[]> {
    return this.linkModel.findAll({
      attributes: ['linkName', 'linkUrl', 'linkDescription', 'linkTarget'],
      include: [{
        model: TaxonomyModel,
        through: { attributes: []},
        attributes: ['created', 'modified'],
        where: {
          slug: {
            [Op.eq]: param.slug
          },
          taxonomy: {
            [Op.eq]: 'link'
          }
        }
      }],
      where: {
        linkVisible: param.visible
      },
      order: [
        ['linkOrder', 'desc']
      ]
    });
  }

  async getFriendLinks(visible: LinkVisible | LinkVisible[]): Promise<LinkModel[]> {
    return this.getLinksByType({
      slug: 'friendlink',
      visible: visible
    });
  }

  async getQuickLinks(): Promise<LinkModel[]> {
    return this.getLinksByType({
      slug: 'quicklink',
      visible: [LinkVisible.HOMEPAGE, LinkVisible.SITE]
    });
  }

  async getLinks(param: LinkQueryParam): Promise<LinkListVo> {
    const { visible, keyword, orders } = param;
    const pageSize = param.pageSize || 10;
    const where = {
    };
    if (Array.isArray(visible) && visible.length > 0 || visible) {
      where['linkVisible'] = visible;
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

    const total = await this.linkModel.count({ where });
    const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);
    /* findAndCountAll无法判断page大于最大页数的情况 */
    const links = await this.linkModel.findAll({
      where,
      order: orders || [['linkOrder', 'desc']],
      limit: pageSize,
      offset: pageSize * (page - 1)
    });
    return { links, page, total };
  }

  async getLinkById(linkId: string): Promise<LinkModel> {
    return this.linkModel.findByPk(linkId, {
      attributes: ['linkId', 'linkUrl', 'linkName', 'linkTarget', 'linkDescription', 'linkVisible', 'linkOrder'],
      include: [{
        model: TaxonomyModel,
        attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parentId', 'termOrder', 'count'],
        where: {
          type: {
            [Op.eq]: TaxonomyType.LINK
          }
        }
      }]
    });
  }

  async saveLink(linkDto: LinkDto): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      if (!linkDto.linkId) {
        linkDto.linkId = getUuid();
        await this.linkModel.create({ ...linkDto }, { transaction: t });
        await this.taxonomyRelationshipModel.create({
          objectId: linkDto.linkId,
          termTaxonomyId: linkDto.linkTaxonomy
        }, {
          transaction: t
        });
      } else {
        await this.linkModel.update({ ...linkDto }, {
          where: {
            linkId: {
              [Op.eq]: linkDto.linkId
            }
          },
          transaction: t
        });
        await this.taxonomyRelationshipModel.update({
          termTaxonomyId: linkDto.linkTaxonomy
        }, {
          where: {
            objectId: {
              [Op.eq]: linkDto.linkId
            }
          },
          transaction: t
        });
      }
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
      await this.linkModel.destroy({
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
