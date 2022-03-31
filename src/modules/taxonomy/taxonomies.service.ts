import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { TaxonomyStatus, TaxonomyStatusDesc, TaxonomyType } from '../../common/common.enum';
import { DEFAULT_LINK_TAXONOMY_ID, DEFAULT_POST_TAXONOMY_ID } from '../../common/constants';
import { TaxonomyDto } from '../../dtos/taxonomy.dto';
import { getUuid } from '../../helpers/helper';
import { CrumbEntity } from '../../interfaces/crumb.interface';
import { TaxonomyEntity, TaxonomyList, TaxonomyNode, TaxonomyQueryParam, TaxonomyStatusMap } from '../../interfaces/taxonomies.interface';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { LoggerService } from '../logger/logger.service';
import { PaginatorService } from '../paginator/paginator.service';

@Injectable()
export class TaxonomiesService {
  constructor(
    @InjectModel(TaxonomyModel)
    private readonly taxonomyModel: typeof TaxonomyModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    private readonly paginatorService: PaginatorService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  generateTaxonomyTree(taxonomyData: TaxonomyEntity[]): TaxonomyNode[] {
    // todo: improve
    const tree: TaxonomyNode[] = [];
    const iteratedIds: string[] = [];
    const iterator = (treeData: TaxonomyEntity[], parentId: string, parentNode: TaxonomyNode[], level: number) => {
      treeData.map(item => {
        if (!iteratedIds.includes(item.taxonomyId)) {
          if (item.parentId === parentId) {
            parentNode.push({
              ...item,
              level,
              children: []
            });
            iteratedIds.push(item.taxonomyId);
            iterator(treeData, item.taxonomyId, parentNode[parentNode.length - 1].children, level + 1);
          }
        }
      });
    };
    iterator(taxonomyData, '', tree, 1);
    return tree;
  }

  flattenTaxonomyTree(tree: TaxonomyNode[], output: TaxonomyNode[]): TaxonomyNode[] {
    tree.forEach((curNode) => {
      output.push({
        name: curNode.name,
        slug: curNode.slug,
        taxonomyId: curNode.taxonomyId,
        level: curNode.level
      });
      if (curNode.hasChildren) {
        this.flattenTaxonomyTree(curNode.children, output);
      }
    });
    return output;
  }

  getTaxonomyPath(param: { taxonomyData: TaxonomyNode[], slug?: string, taxonomyId?: string }): CrumbEntity[] {
    let { taxonomyData, slug, taxonomyId } = param;
    const crumbs: CrumbEntity[] = [];

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
            'label': curNode.name,
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

  getSubTaxonomies(param: { taxonomyTree: TaxonomyNode[], taxonomyData: TaxonomyNode[], slug: string }) {
    const subTaxonomyIds: string[] = [];
    const iterator = (nodes: TaxonomyNode[], checked = false, slug?: string) => {
      nodes.forEach((curNode) => {
        if (checked || curNode.slug === slug) {
          subTaxonomyIds.push(curNode.taxonomyId);
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

  getAllTaxonomyStatusValues(): TaxonomyStatus[] {
    return Object.keys(TaxonomyStatus).filter((key) => !/^\d+$/i.test(key)).map((key) => TaxonomyStatus[key]);
  }

  async getTaxonomyTreeData(
    status: TaxonomyStatus | TaxonomyStatus[] = TaxonomyStatus.OPEN,
    type: TaxonomyType = TaxonomyType.POST
  ): Promise<TaxonomyEntity[]> {
    let where: WhereOptions = {
      type: {
        [Op.eq]: type
      },
      status
    };
    return this.taxonomyModel.findAll({
      attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parentId', 'status', 'count', 'termOrder'],
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
          parentId: taxonomy.parentId,
          status: taxonomy.status
        };
        for (let i = 0; i < taxonomies.length; i += 1) {
          if (taxonomy.taxonomyId === taxonomies[i].parentId) {
            nodeData.hasChildren = true;
            break;
          }
        }
        return nodeData;
      });
      return Promise.resolve(treeData);
    });
  }

  async getTaxonomiesByPostIds(postIds: string[], isAdmin?: boolean): Promise<TaxonomyModel[]> {
    const where = {
      [Op.or]: [{
        type: {
          [Op.eq]: TaxonomyType.POST
        },
        status: isAdmin ? [TaxonomyStatus.CLOSED, TaxonomyStatus.OPEN] : [TaxonomyStatus.OPEN]
      }, {
        type: {
          [Op.eq]: TaxonomyType.TAG
        },
        status: {
          [Op.eq]: 1
        }
      }]
    };
    return this.taxonomyModel.findAll({
      attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parentId', 'status', 'count'],
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

  async getTaxonomies(param: TaxonomyQueryParam): Promise<TaxonomyList> {
    const { type, status, keyword, orders } = param;
    const pageSize = param.pageSize === 0 ? 0 : param.pageSize || 10;
    let where = {
      type: {
        [Op.eq]: type
      }
    };
    if (status && status.length > 0) {
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
    const total = await this.taxonomyModel.count({ where });
    const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);
    const queryOpt: FindOptions = {
      where,
      order: orders || [['termOrder', 'asc'], ['created', 'desc']],
      subQuery: false
    };
    if (pageSize !== 0) {
      queryOpt.limit = pageSize;
      queryOpt.offset = pageSize * (page - 1);
    }
    const taxonomies = await this.taxonomyModel.findAll(queryOpt);

    return {
      taxonomies, page, total
    };
  }

  async checkTaxonomySlugExist(slug: string, type: string, taxonomyId?: string): Promise<{ taxonomy: TaxonomyModel, isExist: boolean }> {
    const where: WhereOptions = {
      slug: {
        [Op.eq]: slug
      },
      status: {
        [Op.eq]: TaxonomyStatus.OPEN
      },
      type: {
        [Op.eq]: type
      }
    };
    if (taxonomyId) {
      where['taxonomyId'] = {
        [Op.ne]: taxonomyId
      };
    }
    const taxonomy = await this.taxonomyModel.findOne({
      attributes: ['taxonomyId', 'type', 'name', 'slug', 'status'],
      where
    });
    return {
      taxonomy,
      isExist: !!taxonomy
    };
  }

  async checkTaxonomyExist(taxonomyId: string): Promise<boolean> {
    const total = await this.taxonomyModel.count({
      where: {
        taxonomyId: {
          [Op.eq]: taxonomyId
        }
      }
    });
    return total > 0;
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
          parentId: type === TaxonomyType.POST ? DEFAULT_POST_TAXONOMY_ID : DEFAULT_LINK_TAXONOMY_ID
        }, {
          where: {
            parentId: {
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
        data: { type, taxonomyIds },
        stack: err.stack
      });
      return Promise.resolve(false);
    });
  }

  async searchTags(keyword: string): Promise<TaxonomyModel[]> {
    const rowsLimit = 10;
    const queryOpt: FindOptions = {
      where: {
        type: {
          [Op.eq]: TaxonomyType.TAG
        },
        name: {
          [Op.like]: `%${keyword}%`
        }
      },
      order: [['termOrder', 'asc'], ['created', 'desc']],
      limit: rowsLimit,
      offset: 0
    };
    return this.taxonomyModel.findAll(queryOpt);
  }
}
