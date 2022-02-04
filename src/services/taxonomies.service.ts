import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { DEFAULT_LINK_TAXONOMY_ID, DEFAULT_POST_TAXONOMY_ID } from '../common/constants';
import { TaxonomyStatus, TaxonomyStatusDesc, TaxonomyType } from '../common/common.enum';
import TaxonomyDto from '../dtos/taxonomy.dto';
import { getUuid, isEmptyObject } from '../helpers/helper';
import { CrumbData } from '../interfaces/crumb.interface';
import { TaxonomyListVo, TaxonomyNode, TaxonomyStatusMap, TaxonomyTree } from '../interfaces/taxonomies.interface';
import TaxonomyModel from '../models/taxonomy.model';
import TaxonomyRelationshipModel from '../models/taxonomy-relationship.model';
import LoggerService from './logger.service';
import PaginatorService from './paginator.service';
import UtilService from './util.service';

@Injectable()
export default class TaxonomiesService {
  constructor(
    @InjectModel(TaxonomyModel)
    private readonly taxonomyModel: typeof TaxonomyModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  generateTaxonomyTree(taxonomyData: TaxonomyNode[]): Record<string, TaxonomyNode> {
    const tree: Record<string, TaxonomyNode> = {};
    const iteratedIds: string[] = [];
    const iterator = (treeData: TaxonomyNode[], parentId: string, parentNode: TaxonomyNode, level: number) => {
      treeData.map(item => {
        if (!iteratedIds.includes(item.taxonomyId)) {
          if (item.parentId === parentId) {
            parentNode[item.taxonomyId] = {
              ...item,
              level,
              children: {}
            };
            iteratedIds.push(item.taxonomyId);
            iterator(treeData, item.taxonomyId, parentNode[item.taxonomyId].children, level + 1);
          }
        }
      });
    };
    iterator(taxonomyData, '', tree, 1);
    return tree;
  }

  flattenTaxonomyTree(tree: Record<string, TaxonomyNode>, output: TaxonomyNode[]): TaxonomyNode[] {
    Object.keys(tree).forEach((key) => {
      const curNode = tree[key];
      output.push({
        name: curNode.name,
        slug: curNode.slug,
        taxonomyId: curNode.taxonomyId,
        level: curNode.level
      });
      if (!isEmptyObject(curNode.children)) {
        this.flattenTaxonomyTree(curNode.children, output);
      }
    });
    return output;
  }

  getTaxonomyTree(data: TaxonomyNode[]): TaxonomyTree {
    const tree = this.generateTaxonomyTree(data);
    return {
      taxonomyData: data,
      taxonomyTree: tree,
      taxonomyList: this.flattenTaxonomyTree(tree, [])
    };
  }

  getTaxonomyPath(param: { taxonomyData: TaxonomyNode[], slug?: string, taxonomyId?: string }): CrumbData[] {
    let { taxonomyData, slug, taxonomyId } = param;
    const crumbs: CrumbData[] = [];

    if (slug) {
      // 根据slug获取ID
      for (let i = 0; i < taxonomyData.length; i += 1) {
        if (taxonomyData[i].slug === slug) {
          taxonomyId = taxonomyData[i].taxonomyId;
          break;
        }
      }
    }
    // 循环获取父分类
    while (taxonomyId) {
      for (let i = 0; i < taxonomyData.length; i += 1) {
        const curNode = taxonomyData[i];
        if (curNode.taxonomyId === taxonomyId) {
          taxonomyId = curNode.parentId;
          crumbs.unshift({
            'title': curNode.name,
            'tooltip': curNode.description,
            'slug': curNode.slug,
            'url': '/category/' + curNode.slug,
            'headerFlag': false
          });
          break;
        }
      }
    }
    if (crumbs.length > 0) {
      crumbs[crumbs.length - 1].headerFlag = true;
    }

    return crumbs;
  }

  getSubTaxonomies(param: { taxonomyTree: Record<string, TaxonomyNode>, taxonomyData: TaxonomyNode[], slug: string }) {
    const subTaxonomyIds: string[] = [];
    const iterator = (nodes: Record<string, TaxonomyNode>, checked = false, slug?: string) => {
      Object.keys(nodes).forEach((key) => {
        const curNode = nodes[key];
        if (checked || curNode.slug === slug) {
          subTaxonomyIds.push(key);
          if (curNode.hasChildren) {
            iterator(curNode.children, true);
          }
        } else {
          if (curNode.hasChildren) {
            iterator(curNode.children, false, slug);
          }
        }
      });
    };
    iterator(param.taxonomyTree, false, param.slug);

    return {
      subTaxonomyIds,
      crumbs: this.getTaxonomyPath({
        taxonomyData: param.taxonomyData,
        slug: param.slug
      })
    };
  }

  getAllTaxonomyStatus(): TaxonomyStatusMap[] {
    const status: TaxonomyStatusMap[] = [];
    Object.keys(TaxonomyStatus).filter((key) => !/^\d+$/i.test(key)).forEach((key) => {
      status.push({
        name: TaxonomyStatus[key],
        desc: TaxonomyStatusDesc[key]
      });
    });
    return status;
  }

  getAllTaxonomyStatusValues(): number[] {
    return Object.keys(TaxonomyStatus).filter((key) => !/^\d+$/i.test(key)).map((key) => TaxonomyStatus[key]);
  }

  async getAllTaxonomies(status?: number[], type: string = 'post'): Promise<TaxonomyNode[]> {
    let where: WhereOptions = {
      type: {
        [Op.eq]: type
      }
    };
    if (status && status.length > 0) {
      where.status = status;
    }
    return this.taxonomyModel.findAll({
      attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parent', 'status', 'count', 'termOrder'],
      where,
      order: [['termOrder', 'asc']]
    }).then((taxonomies) => {
      const treeData: TaxonomyNode[] = taxonomies.map((taxonomy) => {
        const nodeData: TaxonomyNode = {
          name: taxonomy.name,
          description: taxonomy.description,
          slug: taxonomy.slug,
          count: taxonomy.count,
          taxonomyId: taxonomy.taxonomyId,
          parentId: taxonomy.parent,
          status: taxonomy.status
        };
        for (let i = 0; i < taxonomies.length; i += 1) {
          if (taxonomy.taxonomyId === taxonomies[i].parent) {
            nodeData.hasChildren = true;
            break;
          }
        }
        return nodeData;
      });
      return Promise.resolve(treeData);
    });
  }

  async getTaxonomiesByPostIds(param: { postIds: string[], isAdmin?: boolean }): Promise<TaxonomyModel[]> {
    const { postIds, isAdmin } = param;
    const where = {
      [Op.or]: [{
        type: {
          [Op.eq]: 'post'
        },
        status: isAdmin ? [0, 1] : [1]
      }, {
        type: {
          [Op.eq]: 'tag'
        },
        status: {
          [Op.eq]: 1
        }
      }]
    };
    return this.taxonomyModel.findAll({
      attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parent', 'status', 'count'],
      include: [{
        model: TaxonomyRelationshipModel,
        attributes: ['objectId', 'termTaxonomyId'],
        where: {
          objectId: {
            [Op.in]: postIds
          }
        }
      }],
      where,
      order: [['termOrder', 'asc']]
    });
  }

  async getTaxonomyById(taxonomyId: string): Promise<TaxonomyModel> {
    return this.taxonomyModel.findByPk(taxonomyId);
  }

  async getTaxonomyBySlug(slug: string): Promise<TaxonomyModel> {
    return this.taxonomyModel.findOne({
      where: {
        slug: {
          [Op.eq]: slug
        }
      }
    });
  }

  async getTaxonomies(param: { page: number, type: string, status?: number, keyword?: string }): Promise<TaxonomyListVo> {
    const { type, status, keyword } = param;
    let where = {
      type: {
        [Op.eq]: type
      }
    };
    if (typeof status === 'number' && /^\d+$/i.test(status.toString())) {
      where['status'] = status;
    }
    if (keyword) {
      where[Op.or] = [{
        name: {
          [Op.like]: `%${keyword}%`
        }
      }, {
        slug: {
          [Op.like]: `%${keyword}%`
        }
      }, {
        description: {
          [Op.like]: `%${keyword}%`
        }
      }];
    }
    const pageSize = this.paginatorService.getPageSize();
    const count = await this.taxonomyModel.count({ where });
    const page = Math.max(Math.min(param.page, Math.ceil(count / pageSize)), 1);

    const taxonomies = await this.taxonomyModel.findAll({
      where,
      order: [['termOrder', 'asc'], ['created', 'desc']],
      limit: pageSize,
      offset: pageSize * (page - 1),
      subQuery: false
    });
    taxonomies.forEach((taxonomy) => {
      taxonomy.statusDesc = TaxonomyStatusDesc[this.utilService.getEnumKeyByValue(TaxonomyStatus, taxonomy.status)];
    });

    return {
      taxonomies, page, count
    };
  }

  async checkTaxonomySlugExist(slug: string, taxonomyId?: string): Promise<boolean> {
    const where = {
      slug: {
        [Op.eq]: slug
      }
    };
    if (taxonomyId) {
      where['taxonomyId'] = {
        [Op.ne]: taxonomyId
      };
    }
    const count = await this.taxonomyModel.count({ where });
    return count > 0;
  }

  async saveTaxonomy(taxonomyDto: TaxonomyDto): Promise<boolean> {
    if (!taxonomyDto.taxonomyId) {
      taxonomyDto.taxonomyId = getUuid();
      return this.taxonomyModel.create({ ...taxonomyDto }).then((taxonomy) => Promise.resolve(true));
    }
    return this.taxonomyModel.update(taxonomyDto, {
      where: {
        taxonomyId: {
          [Op.eq]: taxonomyDto.taxonomyId
        }
      }
    }).then((result) => Promise.resolve(true));
  }

  async removeTaxonomies(type: string, taxonomyIds: string[]): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      await this.taxonomyModel.update({
        status: TaxonomyStatus.TRASH
      }, {
        where: {
          taxonomyId: {
            [Op.in]: taxonomyIds
          }
        },
        transaction: t
      });
      if (type === TaxonomyType.TAG) {
        await this.taxonomyRelationshipModel.destroy({
          where: {
            termTaxonomyId: {
              [Op.in]: taxonomyIds
            }
          },
          transaction: t
        });
      } else {
        await this.taxonomyRelationshipModel.update({
          termTaxonomyId: type === TaxonomyType.POST ? DEFAULT_POST_TAXONOMY_ID : DEFAULT_LINK_TAXONOMY_ID
        }, {
          where: {
            termTaxonomyId: {
              [Op.in]: taxonomyIds
            }
          },
          transaction: t
        });
        await this.taxonomyModel.update({
          parent: type === TaxonomyType.POST ? DEFAULT_POST_TAXONOMY_ID : DEFAULT_LINK_TAXONOMY_ID
        }, {
          where: {
            parent: {
              [Op.in]: taxonomyIds
            }
          },
          transaction: t
        });
      }
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '分类删除失败。',
        data: {type, taxonomyIds},
        stack: err.stack
      });
      return Promise.resolve(false);
    });
  }
}
