import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { DEFAULT_LINK_TAXONOMY_ID, DEFAULT_POST_TAXONOMY_ID } from '../../common/constants';
import { TaxonomyDto } from '../../dtos/taxonomy.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { getUuid } from '../../helpers/helper';
import { CrumbEntity } from '../../interfaces/crumb.interface';
import { TaxonomyList, TaxonomyNode, TaxonomyQueryParam } from '../../interfaces/taxonomies.interface';
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

  generateTaxonomyTree(taxonomyData: TaxonomyModel[]): TaxonomyNode[] {
    const nodes: TaxonomyNode[] = taxonomyData.map((item) => <TaxonomyNode>item.get());
    return nodes.filter((father) => {
      father.children = nodes.filter((child) => father.taxonomyId === child.parentId);
      father.isLeaf = father.children.length < 1;
      return !father.parentId;
    });
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

  async getTaxonomies(param: TaxonomyQueryParam): Promise<TaxonomyList> {
    param.page = param.page || 1;
    const { type, status, keyword, orders } = param;
    const pageSize = param.pageSize === 0 ? 0 : param.pageSize || 10;
    let where = {
      type: type
    };
    if (Array.isArray(status) && status.length > 0 || !Array.isArray(status) && status) {
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
    const queryOpt: FindOptions = {
      where,
      order: orders || [['termOrder', 'asc'], ['created', 'desc']],
      subQuery: false
    };
    let total: number;
    let page: number;
    if (pageSize !== 0) {
      total = await this.taxonomyModel.count({ where });
      page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);
      queryOpt.limit = pageSize;
      queryOpt.offset = pageSize * (page - 1);
    }
    const taxonomies = await this.taxonomyModel.findAll(queryOpt);

    return {
      taxonomies,
      page: page || 1,
      total: total || taxonomies.length
    };
  }

  async getAllChildTaxonomies<T extends string[] | TaxonomyNode[]>(
    param: {
      status: TaxonomyStatus | TaxonomyStatus[],
      type: TaxonomyType,
      id?: string,
      slug?: string,
      returnId?: boolean,
      taxonomyTree?: TaxonomyNode[]
    }
  ): Promise<T> {
    const { type, status, id, slug } = param;
    if (!id && !slug) {
      throw new BadRequestException();
    }
    let taxonomyTree: TaxonomyNode[] = param.taxonomyTree;
    if (!taxonomyTree) {
      const { taxonomies } = await this.getTaxonomies({
        status,
        type,
        pageSize: 0
      });
      taxonomyTree = this.generateTaxonomyTree(taxonomies);
    }
    const returnId = typeof param.returnId !== 'boolean' ? true : param.returnId;
    const subTaxonomyIds: string[] = [];
    const subTaxonomies: TaxonomyNode[] = [];
    const iterator = (nodes: TaxonomyNode[], checked = false, id?: string, slug?: string) => {
      nodes.forEach((curNode) => {
        if (checked || (id && curNode.taxonomyId === id) || (slug && curNode.slug === slug)) {
          if (returnId) {
            subTaxonomyIds.push(curNode.taxonomyId);
          } else {
            subTaxonomies.push(curNode);
          }
          !curNode.isLeaf && iterator(curNode.children, true);
        } else {
          !curNode.isLeaf && iterator(curNode.children, false, id, slug);
        }
      });
    };
    iterator(taxonomyTree, false, id, slug);

    return (returnId ? subTaxonomyIds : subTaxonomies) as T;
  }

  async getAllParentTaxonomies<T extends string[] | TaxonomyNode[]>(param: {
    status: TaxonomyStatus | TaxonomyStatus[],
    type: TaxonomyType,
    id: string,
    returnId?: boolean,
    taxonomyData?: TaxonomyNode[]
  }): Promise<T> {
    let taxonomyData = param.taxonomyData;
    const { type, status, id } = param;
    if (!taxonomyData) {
      const taxonomyList = await this.getTaxonomies({
        status,
        type,
        pageSize: 0
      });
      taxonomyData = taxonomyList.taxonomies;
    }
    const returnId = typeof param.returnId !== 'boolean' ? true : param.returnId;
    const parentTaxonomyIds: string[] = [];
    const parentTaxonomies: TaxonomyNode[] = [];
    const iterator = (nodes: TaxonomyNode[], parentId: string) => {
      for (let item of taxonomyData) {
        if (item.taxonomyId === parentId) {
          if (returnId) {
            parentTaxonomyIds.push(item.taxonomyId);
          } else {
            parentTaxonomies.push(item);
          }
          if (item.parentId) {
            iterator(taxonomyData, item.parentId);
          }
          break;
        }
      }
    };
    iterator(taxonomyData, id);

    return (returnId ? parentTaxonomyIds : parentTaxonomies) as T;
  }

  async getTaxonomiesByPostIds(
    postIds: string | string[],
    isAdmin?: boolean,
    type: TaxonomyType | TaxonomyType[] = [TaxonomyType.POST, TaxonomyType.TAG]
  ): Promise<TaxonomyModel[]> {
    const where = {
      type: {
        [Op.in]: !type || Array.isArray(type) && type.length < 1 ? [TaxonomyType.POST, TaxonomyType.TAG] : type
      },
      status: isAdmin ? [TaxonomyStatus.PRIVATE, TaxonomyStatus.PUBLISH] : [TaxonomyStatus.PUBLISH]
    };
    return this.taxonomyModel.findAll({
      attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parentId', 'status', 'count'],
      include: [{
        model: TaxonomyRelationshipModel,
        attributes: ['objectId', 'termTaxonomyId'],
        where: {
          objectId: postIds
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

  async checkTaxonomySlugExist(slug: string, type: string, taxonomyId?: string): Promise<{ taxonomy: TaxonomyModel, isExist: boolean }> {
    const where: WhereOptions = {
      slug: {
        [Op.eq]: slug
      },
      status: {
        [Op.eq]: TaxonomyStatus.PUBLISH
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
    return this.sequelize.transaction(async (t) => {
      await this.taxonomyModel.update(taxonomyDto, {
        where: {
          taxonomyId: {
            [Op.eq]: taxonomyDto.taxonomyId
          }
        },
        transaction: t
      });
      if (taxonomyDto.type !== TaxonomyType.TAG) {
        if (taxonomyDto.status !== TaxonomyStatus.PUBLISH) {
          /* if status is not PUBLISH, also set it's all children's statuses to the same */
          const subTaxonomyIds = await this.getAllChildTaxonomies<string[]>({
            status: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE],
            type: TaxonomyType.POST,
            id: taxonomyDto.taxonomyId
          });
          await this.taxonomyModel.update({
            status: taxonomyDto.status
          }, {
            where: {
              taxonomyId: subTaxonomyIds
            },
            transaction: t
          });
        } else if (taxonomyDto.status === TaxonomyStatus.PUBLISH && taxonomyDto.parentId) {
          /* if status is PUBLISH, also set it's all parents' statuses to the same */
          const parentTaxonomyIds = await this.getAllParentTaxonomies<string[]>({
            status: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE, TaxonomyStatus.TRASH],
            type: TaxonomyType.POST,
            id: taxonomyDto.parentId
          });
          await this.taxonomyModel.update({
            status: taxonomyDto.status
          }, {
            where: {
              taxonomyId: parentTaxonomyIds
            },
            transaction: t
          });
        }
      }
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '保存失败',
        data: taxonomyDto,
        stack: err.stack
      });
      return Promise.resolve(false);
    });
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

  async updateAllCount(type?: TaxonomyType | TaxonomyType[]): Promise<boolean> {
    const where: WhereOptions = {
      status: {
        [Op.ne]: TaxonomyStatus.TRASH
      }
    };
    if (type) {
      where.type = type;
    }
    return this.taxonomyModel.update({
      count: Sequelize.literal(
        '(select count(1) total from term_relationships where term_relationships.term_taxonomy_id = term_taxonomy.taxonomy_id)'
      )
    }, {
      where,
      silent: true
    }).then((result) => Promise.resolve(true));
  }
}
