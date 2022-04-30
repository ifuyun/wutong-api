import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { uniq, uniqBy } from 'lodash';
import { FindOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { GroupedCountResultItem } from 'sequelize/types/model';
import { BreadcrumbEntity } from '../../common/breadcrumb.interface';
import { TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { TaxonomyDto } from '../../dtos/taxonomy.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { format, getUuid } from '../../helpers/helper';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { LoggerService } from '../logger/logger.service';
import { TaxonomyList, TaxonomyNode, TaxonomyQueryParam } from './taxonomy.interface';

@Injectable()
export class TaxonomyService {
  constructor(
    @InjectModel(TaxonomyModel)
    private readonly taxonomyModel: typeof TaxonomyModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  generateTaxonomyTree(taxonomyData: TaxonomyModel[]): TaxonomyNode[] {
    const nodes: TaxonomyNode[] = taxonomyData.map((item) => <TaxonomyNode>item.get());
    return nodes.filter((father) => {
      father.children = nodes.filter((child) => father.taxonomyId === child.taxonomyParent);
      father.isLeaf = father.children.length < 1;
      return !father.taxonomyParent;
    });
  }

  getTaxonomyPath(param: { taxonomyData: TaxonomyModel[], slug?: string, taxonomyId?: string }): BreadcrumbEntity[] {
    let { taxonomyData, slug, taxonomyId } = param;
    const crumbs: BreadcrumbEntity[] = [];

    if (slug) {
      // 根据slug获取ID
      for (let i = 0; i < taxonomyData.length; i += 1) {
        if (taxonomyData[i].taxonomySlug === slug) {
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
          taxonomyId = curNode.taxonomyParent;
          crumbs.unshift({
            'label': curNode.taxonomyName,
            'tooltip': curNode.taxonomyDescription,
            'slug': curNode.taxonomySlug,
            'url': '/category/' + curNode.taxonomySlug,
            'isHeader': false
          });
          break;
        }
      }
    }
    if (crumbs.length > 0) {
      crumbs[crumbs.length - 1].isHeader = true;
    }

    return crumbs;
  }

  async getTaxonomies(param: TaxonomyQueryParam): Promise<TaxonomyList> {
    param.page = param.page || 1;
    const { type, status, keyword, orders } = param;
    const pageSize = param.pageSize === 0 ? 0 : param.pageSize || 10;
    const where = {
      taxonomyType: type
    };
    if (Array.isArray(status) && status.length > 0 || !Array.isArray(status) && status) {
      where['taxonomyStatus'] = status;
    }
    if (keyword) {
      where[Op.or] = [{
        taxonomyName: {
          [Op.like]: `%${keyword}%`
        }
      }, {
        taxonomySlug: {
          [Op.like]: `%${keyword}%`
        }
      }, {
        taxonomyDescription: {
          [Op.like]: `%${keyword}%`
        }
      }];
    }
    const queryOpt: FindOptions = {
      where,
      order: orders || [['taxonomyOrder', 'asc'], ['taxonomyCreated', 'desc']],
      subQuery: false
    };
    try {
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
    } catch (e) {
      this.logger.error({
        message: e.message || '分类查询失败',
        data: param,
        stack: e.stack
      });
      throw new DbQueryErrorException();
    }
  }

  async getTaxonomyById(taxonomyId: string): Promise<TaxonomyModel> {
    return this.taxonomyModel.findByPk(taxonomyId).catch((e) => {
      this.logger.error({
        message: e.message || '分类查询失败',
        data: { taxonomyId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getTaxonomyBySlug(slug: string): Promise<TaxonomyModel> {
    return this.taxonomyModel.findOne({
      where: {
        slug: {
          [Op.eq]: slug
        }
      }
    }).catch((e) => {
      this.logger.error({
        message: e.message || '分类查询失败',
        data: { slug },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getTaxonomiesByIds(ids: string[], isRequired?: boolean): Promise<TaxonomyModel[]> {
    const where: WhereOptions = {
      taxonomyId: {
        [Op.in]: ids
      }
    };
    if (typeof isRequired === 'boolean') {
      where.taxonomyIsRequired = isRequired ? 1 : 0;
    }
    return this.taxonomyModel.findAll({
      where
    }).catch((e) => {
      this.logger.error({
        message: e.message || '分类查询失败',
        data: { ids, isRequired },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getAllChildTaxonomies<T extends string[] | TaxonomyNode[]>(
    param: {
      status: TaxonomyStatus | TaxonomyStatus[],
      type: TaxonomyType,
      id?: string | string[],
      slug?: string,
      returnId?: boolean,
      taxonomyTree?: TaxonomyNode[]
    }
  ): Promise<T> {
    const { type, status, id, slug } = param;
    if ((!id || Array.isArray(id) && id.length < 1) && !slug) {
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
        if (checked || (id && curNode.taxonomyId === id) || (slug && curNode.taxonomySlug === slug)) {
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
    const idList = Array.isArray(id) ? id : [id];
    idList.forEach((id) => iterator(taxonomyTree, false, id, slug));

    return (returnId ? uniq(subTaxonomyIds) : uniqBy(subTaxonomies, 'taxonomyId')) as T;
  }

  async getAllParentTaxonomies<T extends string[] | TaxonomyNode[]>(
    param: {
      status: TaxonomyStatus | TaxonomyStatus[],
      type: TaxonomyType,
      id: string,
      returnId?: boolean,
      taxonomyData?: TaxonomyNode[]
    }
  ): Promise<T> {
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
          if (item.taxonomyParent) {
            iterator(taxonomyData, item.taxonomyParent);
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
      taxonomyType: {
        [Op.in]: !type || Array.isArray(type) && type.length < 1 ? [TaxonomyType.POST, TaxonomyType.TAG] : type
      },
      taxonomyStatus: isAdmin ? [TaxonomyStatus.PRIVATE, TaxonomyStatus.PUBLISH] : [TaxonomyStatus.PUBLISH]
    };
    return this.taxonomyModel.findAll({
      attributes: {
        exclude: ['taxonomyCreated', 'taxonomyModified']
      },
      include: [{
        model: TaxonomyRelationshipModel,
        attributes: ['objectId', 'taxonomyId'],
        where: {
          objectId: postIds
        }
      }],
      where,
      order: [['taxonomyOrder', 'asc']]
    }).catch((e) => {
      this.logger.error({
        message: e.message || '分类查询失败',
        data: { postIds, isAdmin, type },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async checkTaxonomySlugExist(slug: string, type: string, taxonomyId?: string): Promise<{
    taxonomy: TaxonomyModel,
    isExist: boolean
  }> {
    const where: WhereOptions = {
      taxonomySlug: {
        [Op.eq]: slug
      },
      taxonomyStatus: {
        [Op.eq]: TaxonomyStatus.PUBLISH
      },
      taxonomyType: {
        [Op.eq]: type
      }
    };
    if (taxonomyId) {
      where['taxonomyId'] = {
        [Op.ne]: taxonomyId
      };
    }

    return this.taxonomyModel.findOne({
      attributes: {
        exclude: ['taxonomyCreated', 'taxonomyModified', 'objectCount']
      },
      where
    }).then((taxonomy) => ({
      taxonomy,
      isExist: !!taxonomy
    })).catch((e) => {
      this.logger.error({
        message: e.message || '分类查询失败',
        data: { slug, type, taxonomyId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async checkTaxonomyExist(taxonomyId: string): Promise<boolean> {
    return this.taxonomyModel.count({
      where: {
        taxonomyId: {
          [Op.eq]: taxonomyId
        }
      }
    }).then((total) => total > 0).catch((e) => {
      this.logger.error({
        message: e.message || '分类是否存在查询失败',
        data: { taxonomyId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
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
      if (taxonomyDto.taxonomyType !== TaxonomyType.TAG) {
        if (taxonomyDto.taxonomyStatus !== TaxonomyStatus.PUBLISH) {
          /* if status is PRIVATE, also set it's all PUBLISH children's statuses to PRIVATE
          * if status is TRASH, also set it's all PUBLISH and PRIVATE children's statuses to TRASH */
          const statusWhere = taxonomyDto.taxonomyStatus === TaxonomyStatus.PRIVATE
            ? TaxonomyStatus.PUBLISH : [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE];
          const subTaxonomyIds = await this.getAllChildTaxonomies<string[]>({
            status: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE],
            type: TaxonomyType.POST,
            id: taxonomyDto.taxonomyId
          });
          await this.taxonomyModel.update({
            taxonomyStatus: taxonomyDto.taxonomyStatus
          }, {
            where: {
              taxonomyId: subTaxonomyIds,
              taxonomyStatus: statusWhere
            },
            transaction: t
          });
          /* if status is PRIVATE, also set it's all TRASH parents' statuses to PRIVATE */
          if (taxonomyDto.taxonomyStatus === TaxonomyStatus.PRIVATE) {
            const parentTaxonomyIds = await this.getAllParentTaxonomies<string[]>({
              status: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE, TaxonomyStatus.TRASH],
              type: taxonomyDto.taxonomyType,
              id: taxonomyDto.taxonomyParent
            });
            await this.taxonomyModel.update({
              taxonomyStatus: taxonomyDto.taxonomyStatus
            }, {
              where: {
                taxonomyId: parentTaxonomyIds,
                taxonomyStatus: {
                  [Op.eq]: TaxonomyStatus.TRASH
                }
              },
              transaction: t
            });
          }
        } else if (taxonomyDto.taxonomyStatus === TaxonomyStatus.PUBLISH && taxonomyDto.taxonomyParent) {
          /* if status is PUBLISH, also set it's all parents' statuses to the same */
          const parentTaxonomyIds = await this.getAllParentTaxonomies<string[]>({
            status: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE, TaxonomyStatus.TRASH],
            type: taxonomyDto.taxonomyType,
            id: taxonomyDto.taxonomyParent
          });
          await this.taxonomyModel.update({
            taxonomyStatus: taxonomyDto.taxonomyStatus
          }, {
            where: {
              taxonomyId: parentTaxonomyIds
            },
            transaction: t
          });
        }
      }
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '分类保存失败',
        data: taxonomyDto,
        stack: e.stack
      });
      throw new DbQueryErrorException(
        format(Message.TAXONOMY_SAVE_ERROR, taxonomyDto.taxonomyType === TaxonomyType.TAG ? '标签' : '分类'),
        ResponseCode.TAXONOMY_SAVE_ERROR
      );
    });
  }

  async removeTaxonomies(type: TaxonomyType, taxonomyIds: string[]): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      const updateValue: Record<string, any> = {
        taxonomyStatus: TaxonomyStatus.TRASH
      };
      if (type === TaxonomyType.TAG) {
        updateValue.object_count = 0;
      }
      await this.taxonomyModel.update(updateValue, {
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
            taxonomyId: {
              [Op.in]: taxonomyIds
            }
          },
          transaction: t
        });
      } else {
        const subTaxonomyIds = await this.getAllChildTaxonomies<string[]>({
          status: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE],
          type,
          id: taxonomyIds
        });
        const objectCount = await this.taxonomyRelationshipModel.count({
          where: {
            taxonomyId: {
              [Op.in]: subTaxonomyIds
            }
          }
        });
        if (objectCount > 0) {
          throw new BadRequestException(
            format(Message.TAXONOMY_EXISTS_RELATED_CONTENT, type === TaxonomyType.LINK ? '链接' : '内容')
          );
        }
        await this.taxonomyModel.update({
          taxonomyStatus: TaxonomyStatus.TRASH
        }, {
          where: {
            taxonomyId: {
              [Op.in]: subTaxonomyIds
            }
          },
          transaction: t
        });
      }
    }).then(() => true).catch((e) => {
      const message = e instanceof HttpException ? e.getResponse() : e.message;
      this.logger.error({
        message: message || '分类删除失败',
        data: { type, taxonomyIds },
        stack: e.stack
      });
      if (e instanceof HttpException) {
        throw e;
      }
      throw new DbQueryErrorException(format(Message.TAXONOMY_DELETE_ERROR, type === TaxonomyType.TAG ? '标签' : '分类'));
    });
  }

  async searchTags(keyword: string): Promise<TaxonomyModel[]> {
    const rowsLimit = 10;
    const queryOpt: FindOptions = {
      where: {
        taxonomyType: {
          [Op.eq]: TaxonomyType.TAG
        },
        taxonomyName: {
          [Op.like]: `%${keyword}%`
        }
      },
      order: [['taxonomyOrder', 'asc'], ['taxonomyCreated', 'desc']],
      limit: rowsLimit,
      offset: 0
    };
    return this.taxonomyModel.findAll(queryOpt).catch((e) => {
      this.logger.error({
        message: e.message || '标签搜索失败',
        data: { keyword },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async updateAllCount(type?: TaxonomyType | TaxonomyType[]): Promise<boolean> {
    const where: WhereOptions = {
      taxonomyStatus: {
        [Op.ne]: TaxonomyStatus.TRASH
      }
    };
    if (type) {
      where.taxonomyType = type;
    }
    return this.taxonomyModel.update({
      objectCount: Sequelize.literal(
        '(select count(1) total from taxonomy_relationships where taxonomy_relationships.taxonomy_id = taxonomies.taxonomy_id)'
      )
    }, {
      where,
      silent: true
    }).then((result) => true).catch((e) => {
      this.logger.error({
        message: e.message || '分类关联对象数量更新失败',
        data: { type },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async countTaxonomiesByType(): Promise<GroupedCountResultItem[]> {
    return this.taxonomyModel.count({
      where: {
        taxonomyType: [TaxonomyType.POST, TaxonomyType.TAG],
        taxonomyStatus: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE]
      },
      group: ['taxonomyType']
    }).catch((e) => {
      this.logger.error({
        message: e.message || '分类总数查询失败',
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }
}
