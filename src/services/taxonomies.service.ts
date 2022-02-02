import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { isEmptyObject } from '../helpers/helper';
import { CrumbData } from '../interfaces/crumb.interface';
import { TaxonomyListVo, TaxonomyNode, TaxonomyStatusMap, TaxonomyTree } from '../interfaces/taxonomies.interface';
import TaxonomyModel from '../models/taxonomy.model';
import TaxonomyRelationshipModel from '../models/taxonomy-relationship.model';
import PaginatorService from './paginator.service';
import { CommentStatus, CommentStatusDesc, TaxonomyStatus, TaxonomyStatusDesc } from '../common/enums';
import * as moment from 'moment';
import UtilService from './util.service';

@Injectable()
export default class TaxonomiesService {
  constructor(
    @InjectModel(TaxonomyModel)
    private readonly taxonomyModel: typeof TaxonomyModel,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService
  ) {
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
}
