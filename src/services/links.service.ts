import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import LinkModel from '../models/link.model';
import TaxonomyModel from '../models/taxonomy.model';

@Injectable()
export default class LinksService {
  constructor(
    @InjectModel(LinkModel)
    private readonly linkModel: typeof LinkModel
  ) {
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
        ['linkRating', 'desc']
      ]
    });
  }

  async getFriendLinks(param: {page?: number, from?: string}):Promise<LinkModel[]> {
    return this.getLinks({
      slug: 'friendlink',
      visible: param.from !== 'list' || param.page > 1 ? ['site'] : ['homepage', 'site']
    });
  }

  async getQuickLinks():Promise<LinkModel[]> {
    return this.getLinks({
      slug: 'quicklink',
      visible: ['homepage', 'site']
    });
  }
}
