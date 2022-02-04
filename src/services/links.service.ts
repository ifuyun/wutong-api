import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { LinkTarget, LinkTargetDesc, LinkVisibleScope, LinkVisibleScopeDesc } from '../common/common.enum';
import LinkDto from '../dtos/link.dto';
import { getUuid } from '../helpers/helper';
import { LinkListVo } from '../interfaces/links.interface';
import LinkModel from '../models/link.model';
import TaxonomyModel from '../models/taxonomy.model';
import TaxonomyRelationshipModel from '../models/taxonomy-relationship.model';
import LoggerService from './logger.service';
import PaginatorService from './paginator.service';
import UtilService from './util.service';

@Injectable()
export default class LinksService {
  constructor(
    @InjectModel(LinkModel)
    private readonly linkModel: typeof LinkModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  async getLinks(param: { slug: string, visible: string[] }): Promise<LinkModel[]> {
    return this.linkModel.findAll({
      attributes: ['linkDescription', 'linkUrl', 'linkTarget', 'linkName'],
      include: [{
        model: TaxonomyModel,
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

  async getFriendLinks(param: { page?: number, from?: string }): Promise<LinkModel[]> {
    return this.getLinks({
      slug: 'friendlink',
      visible: param.from !== 'list' || param.page > 1 ? ['site'] : ['homepage', 'site']
    });
  }

  async getQuickLinks(): Promise<LinkModel[]> {
    return this.getLinks({
      slug: 'quicklink',
      visible: ['homepage', 'site']
    });
  }

  async getLinksByPage(page: number = 1): Promise<LinkListVo> {
    const count = await this.linkModel.count();
    const pageSize = this.paginatorService.getPageSize();
    page = Math.max(Math.min(page, Math.ceil(count / pageSize)), 1);
    /* findAndCountAll无法判断page大于最大页数的情况 */
    const links = await this.linkModel.findAll({
      order: [['linkOrder', 'desc']],
      limit: pageSize,
      offset: pageSize * (page - 1)
    });
    links.map((link) => {
      link.createdText = moment(link.created).format('YYYY-MM-DD');
      link.linkVisible = LinkVisibleScopeDesc[this.utilService.getEnumKeyByValue(LinkVisibleScope, link.linkVisible)];
      link.linkTarget = LinkTargetDesc[this.utilService.getEnumKeyByValue(LinkTarget, link.linkTarget)];
    });
    return { links, page, count };
  }

  async getLinkById(linkId: string): Promise<LinkModel> {
    return this.linkModel.findByPk(linkId, {
      attributes: ['linkId', 'linkUrl', 'linkName', 'linkTarget', 'linkDescription', 'linkVisible', 'linkOrder'],
      include: [{
        model: TaxonomyModel,
        attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parent', 'termOrder', 'count'],
        where: {
          type: {
            [Op.eq]: 'link'
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
          }
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
        data: LinkDto,
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
