import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { difference, uniq } from 'lodash';
import { CountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PostStatus, PostType, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { PostDto, PostFileDto } from '../../dtos/post.dto';
import { getUuid } from '../../helpers/helper';
import { PostMetaVo } from '../../interfaces/post-meta.interface';
import { PostArchiveDatesQueryParam, PostListVo, PostQueryParam, PostVo } from '../../interfaces/posts.interface';
import { PostMetaModel } from '../../models/post-meta.model';
import { PostModel } from '../../models/post.model';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { UserModel } from '../../models/user.model';
import { VPostDateArchiveModel } from '../../models/v-post-date-archive.model';
import { VPostViewAverageModel } from '../../models/v-post-view-average.model';
import { LoggerService } from '../logger/logger.service';
import { OptionsService } from '../option/options.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { PostMetaService } from './post-meta.service';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(PostModel)
    private readonly postModel: typeof PostModel,
    @InjectModel(VPostViewAverageModel)
    private readonly postView: typeof VPostViewAverageModel,
    @InjectModel(VPostDateArchiveModel)
    private readonly postArchiveView: typeof VPostDateArchiveModel,
    @InjectModel(TaxonomyModel)
    private readonly taxonomyModel: typeof TaxonomyModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    @InjectModel(PostMetaModel)
    private readonly postMetaModel: typeof PostMetaModel,
    private readonly optionsService: OptionsService,
    private readonly postMetaService: PostMetaService,
    private readonly taxonomyService: TaxonomyService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
  }

  transformArchiveDates(archiveDates: VPostDateArchiveModel[]) {
    const archiveDateList = {};
    (archiveDates || []).forEach((item) => {
      const data = item.get();
      const year = data.dateText.split('/')[0];
      archiveDateList[year] = archiveDateList[year] || {};
      archiveDateList[year].list = archiveDateList[year].list || [];
      archiveDateList[year].list.push(data);
      archiveDateList[year].postCount = archiveDateList[year].postCount || 0;
      archiveDateList[year].postCount += data.count;
    });
    const archiveDateYears = Object.keys(archiveDateList).sort((a, b) => a < b ? 1 : -1);

    return {
      archiveDateList, archiveDateYears
    };
  }

  assemblePostData(posts: PostModel[], postMeta: PostMetaModel[], taxonomies: TaxonomyModel[]): PostVo[] {
    const postList = [];
    posts.forEach((post) => {
      const meta: Record<string, string> = {};
      postMeta.filter((item) => item.postId === post.postId)
        .forEach((item) => meta[item.metaKey] = item.metaValue);

      const matched = taxonomies.filter(
        (item) => item.taxonomyRelationships.filter((r) => r.objectId === post.postId).length > 0
      );
      const tags = matched.filter((item) => item.type === TaxonomyType.TAG);
      const categories = matched.filter((item) => item.type === TaxonomyType.POST);

      postList.push({
        post,
        meta,
        tags,
        categories
      });
    });
    return postList;
  }

  async getRecentPosts(): Promise<PostModel[]> {
    return this.postModel.findAll({
      attributes: ['postId', 'postTitle', 'postGuid'],
      where: {
        postStatus: {
          [Op.eq]: 'publish'
        },
        postType: {
          [Op.eq]: 'post'
        }
      },
      order: [
        ['postModified', 'desc'],
        ['postDate', 'desc']
      ],
      limit: 10,
      offset: 0
    });
  }

  async getRandomPosts(): Promise<PostModel[]> {
    return this.postModel.findAll({
      attributes: ['postId', 'postTitle', 'postGuid'],
      where: {
        postStatus: {
          [Op.eq]: 'publish'
        },
        postType: {
          [Op.eq]: 'post'
        }
      },
      order: [
        [Sequelize.fn('rand'), 'asc']
      ],
      limit: 10,
      offset: 0
    });
  }

  async getHotPosts(): Promise<VPostViewAverageModel[]> {
    return this.postView.findAll({
      attributes: ['postId', 'postTitle', 'postGuid'],
      where: {
        postStatus: {
          [Op.eq]: 'publish'
        },
        postType: {
          [Op.eq]: 'post'
        }
      },
      order: [
        ['viewsAverage', 'desc']
      ],
      limit: 10,
      offset: 0
    });
  }

  async getArchiveDates(param: PostArchiveDatesQueryParam): Promise<VPostDateArchiveModel[]> {
    const { postType, status, limit, showCount, isAdmin, fromAdmin } = param;
    const queryOpt: any = {
      attributes: ['dateText', 'dateTitle'],
      where: {
        postStatus: {
          [Op.in]: [PostStatus.PUBLISH, PostStatus.PASSWORD]
        },
        postType: {
          [Op.eq]: postType
        }
      },
      group: ['dateText'],
      order: [['dateText', 'desc']]
    };
    if (fromAdmin) {
      if (status && status.length > 0) {
        queryOpt.where.postStatus[Op.in] = status.includes(PostStatus.DRAFT)
          ? uniq(status.concat([PostStatus.DRAFT, PostStatus.AUTO_DRAFT])) : status;
      } else {
        queryOpt.where.postStatus[Op.in] = [
          PostStatus.PUBLISH, PostStatus.PASSWORD, PostStatus.PRIVATE, PostStatus.DRAFT, PostStatus.AUTO_DRAFT, PostStatus.TRASH];
      }
    }
    // 0 is no limit, and default is 10
    if (limit !== 0) {
      queryOpt.limit = limit || 10;
      queryOpt.offset = 0;
    }
    if (showCount) {
      queryOpt.attributes.push([Sequelize.fn('count', 1), 'count']);
      queryOpt.group = ['dateText', 'status'];
      if (!isAdmin) {
        queryOpt.having = {
          status: {
            [Op.eq]: 1
          }
        };
      }
    }
    return this.postArchiveView.findAll(queryOpt);
  }

  async getPosts(param: PostQueryParam): Promise<PostListVo> {
    const { isAdmin, keyword, fromAdmin, subTaxonomyIds, tag, year, month, status, commentFlag, author, orders } = param;
    const pageSize = param.pageSize || 10;
    const postType = param.postType || PostType.POST;
    const where = {
      postStatus: {
        [Op.in]: [PostStatus.PUBLISH, PostStatus.PASSWORD]
      },
      postType: {
        [Op.eq]: postType
      }
    };
    if (fromAdmin) {
      if (status && status.length > 0) {
        where.postStatus[Op.in] = status.includes(PostStatus.DRAFT)
          ? uniq(status.concat([PostStatus.DRAFT, PostStatus.AUTO_DRAFT])) : status;
      } else {
        where.postStatus[Op.in] = [
          PostStatus.PUBLISH, PostStatus.PASSWORD, PostStatus.PRIVATE, PostStatus.DRAFT, PostStatus.AUTO_DRAFT, PostStatus.TRASH
        ];
      }
      if (commentFlag && commentFlag.length > 0) {
        where['commentFlag'] = {
          [Op.in]: commentFlag
        };
      }
    }
    if (keyword) {
      where[Op.or] = [{
        postTitle: {
          [Op.like]: `%${keyword}%`
        }
      }, {
        postContent: {
          [Op.like]: `%${keyword}%`
        }
      }, {
        postExcerpt: {
          [Op.like]: `%${keyword}%`
        }
      }];
    }
    if (year) {
      where[Op.and] = [
        Sequelize.where(
          Sequelize.fn('date_format', Sequelize.col('post_date'), month ? '%Y%m' : '%Y'), month ? year + month : year
        )
      ];
    }
    if (author) {
      where['postAuthor'] = {
        [Op.eq]: author
      };
    }
    const includeOpt: IncludeOptions[] = [];
    const includeTmp = {
      model: TaxonomyModel,
      through: { attributes: [] },
      attributes: ['taxonomyId', 'status'],
      where: {
        type: {
          [Op.in]: [TaxonomyType.POST]
        },
        status: {
          [Op.in]: isAdmin ? [TaxonomyStatus.PRIVATE, TaxonomyStatus.PUBLISH] : [TaxonomyStatus.PUBLISH]
        }
      },
      required: !!tag
    };
    if (postType === PostType.POST) {
      includeOpt.push(includeTmp);
    }
    if (tag) {
      if (includeOpt.length < 1) {
        includeOpt.push(includeTmp);
      }
      includeOpt[0].where['type'] = {
        [Op.in]: postType === PostType.POST ? [TaxonomyType.POST, TaxonomyType.TAG] : [TaxonomyType.TAG]
      };
      includeOpt[0].where['slug'] = {
        [Op.eq]: tag
      };
    }
    if (subTaxonomyIds && subTaxonomyIds.length > 0) {
      includeOpt.push({
        model: TaxonomyRelationshipModel,
        attributes: ['objectId'],
        where: {
          taxonomyId: {
            [Op.in]: subTaxonomyIds
          }
        }
      });
    }
    const queryOpt: FindOptions = {
      where,
      attributes: [
        'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt',
        'postStatus', 'commentFlag', 'postOriginal', 'postType', 'postAuthor',
        'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'
      ],
      include: [{
        model: UserModel,
        attributes: ['userNiceName']
      }],
      order: orders || [['postCreated', 'desc'], ['postDate', 'desc']],
      limit: pageSize,
      subQuery: false
    };

    const countOpt: CountOptions = {
      where,
      distinct: true
    };
    if (includeOpt.length > 0) {
      queryOpt.include = (queryOpt.include as IncludeOptions[]).concat(includeOpt);
      queryOpt.group = ['postId'];
      countOpt.include = includeOpt;
    }
    const total = await this.postModel.count(countOpt);
    const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);
    queryOpt.offset = pageSize * (page - 1);

    const posts = await this.postModel.findAll(queryOpt);
    const postIds: string[] = posts.map((post) => post.postId);
    const taxonomies = await this.taxonomyService.getTaxonomiesByPostIds(postIds, isAdmin);
    const postMeta = await this.postMetaService.getPostMetaByPostIds(postIds);

    return {
      posts: this.assemblePostData(posts, postMeta, taxonomies),
      page,
      total
    };
  }

  async getPostById(postId: string, isAdmin?: boolean): Promise<PostModel> {
    let where: WhereOptions = {
      postId: {
        [Op.eq]: postId
      }
    };
    if (!isAdmin) {
      where.postStatus = {
        [Op.in]: [PostStatus.PUBLISH, PostStatus.PASSWORD]
      };
    }
    return this.postModel.findOne({
      attributes: [
        'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus',
        'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified',
        'postCreated', 'postGuid', 'postType', 'commentCount', 'postViewCount'
      ],
      include: [{
        model: UserModel,
        as: 'author',
        attributes: ['userNiceName']
      }, {
        model: PostMetaModel,
        as: 'postMeta',
        attributes: ['metaKey', 'metaValue']
      }, {
        model: TaxonomyModel,
        as: 'taxonomies',
        attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parentId', 'termOrder', 'status', 'count'],
        where: {
          [Op.or]: [{
            type: TaxonomyType.POST,
            status: isAdmin ? [TaxonomyStatus.PRIVATE, TaxonomyStatus.PUBLISH] : TaxonomyStatus.PUBLISH
          }, {
            type: TaxonomyType.TAG,
            status: TaxonomyStatus.PUBLISH
          }]
        },
        // force to use left join
        required: false
      }],
      where
    });
  }

  async getPostBySlug(postSlug: string, isAdmin: boolean): Promise<PostModel> {
    let where: WhereOptions = {
      postGuid: {
        [Op.eq]: decodeURIComponent(postSlug)
      },
      postType: {
        [Op.in]: [PostType.POST, PostType.PAGE]
      }
    };
    if (!isAdmin) {
      where.postStatus = {
        [Op.in]: [PostStatus.PUBLISH, PostStatus.PASSWORD]
      };
    }
    return this.postModel.findOne({
      attributes: [
        'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus',
        'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified',
        'postCreated', 'postGuid', 'commentCount', 'postViewCount'
      ],
      include: [{
        model: UserModel,
        as: 'author',
        attributes: ['userNiceName']
      }, {
        model: PostMetaModel,
        as: 'postMeta',
        attributes: ['metaKey', 'metaValue']
      }],
      where
    });
  }

  async increasePostView(postId: string) {
    return this.postModel.increment({ postViewCount: 1 }, {
      where: {
        postId
      }
    });
  }

  async getPrevPost(postId: string): Promise<PostModel> {
    return this.postModel.findOne({
      attributes: ['postId', 'postGuid', 'postTitle'],
      where: {
        postStatus: {
          [Op.eq]: 'publish'
        },
        postType: {
          [Op.eq]: 'post'
        },
        postCreated: {
          // todo: change to use sub query
          [Op.gt]: Sequelize.literal(`(select post_created from posts where post_id = '${postId}')`)
        }
      },
      order: [
        ['postCreated', 'asc']
      ]
    });
  }

  async getNextPost(postId: string): Promise<PostModel> {
    return this.postModel.findOne({
      attributes: ['postId', 'postGuid', 'postTitle'],
      where: {
        postStatus: {
          [Op.eq]: 'publish'
        },
        postType: {
          [Op.eq]: 'post'
        },
        postCreated: {
          // todo: change to use sub query
          [Op.lt]: Sequelize.literal(`(select post_created from posts where post_id = '${postId}')`)
        }
      },
      order: [
        ['postCreated', 'desc']
      ]
    });
  }

  async checkPostGuidExist(guid: string, postId?: string): Promise<boolean> {
    // 检查范围：全部，包含已删除文章和草稿
    const where: WhereOptions = {
      postGuid: {
        [Op.eq]: guid
      }
    };
    if (postId) {
      where.postId = {
        [Op.ne]: postId
      };
    }
    const total = await this.postModel.count({
      where
    });

    return total > 0;
  }

  async checkPostExist(postId: string): Promise<boolean> {
    const total = await this.postModel.count({
      where: {
        postId: {
          [Op.eq]: postId
        }
      }
    });
    return total > 0;
  }

  async saveFile(postDto: PostFileDto): Promise<PostModel> {
    return this.postModel.create({ ...postDto });
  }

  async savePost(data: {
    newPostId: string,
    postData: PostDto,
    postMeta: PostMetaVo[],
    postTags?: string[],
    postTaxonomies?: string[]
  }): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      const previousTaxonomies = (await this.taxonomyService.getTaxonomiesByPostIds(
        data.postData.postId, true
      )).map((item) => item.taxonomyId);
      let latestTaxonomies: string[] = data.postTaxonomies;
      const latestTags: string[] = [];

      if (data.postData.postId) {
        await this.taxonomyRelationshipModel.destroy({
          where: {
            objectId: {
              [Op.eq]: data.postData.postId
            }
          },
          transaction: t
        });
        await this.postMetaModel.destroy({
          where: {
            postId: {
              [Op.eq]: data.postData.postId
            }
          },
          transaction: t
        });
        await this.postModel.update({ ...data.postData }, {
          where: {
            postId: {
              [Op.eq]: data.postData.postId
            }
          },
          transaction: t
        });
      } else {
        data.postData.postId = data.newPostId;
        await this.postModel.create({ ...data.postData }, {
          transaction: t
        });
      }
      // bulkCreate会报类型错误
      for (const postMeta of data.postMeta) {
        await this.postMetaModel.create({ ...postMeta }, {
          transaction: t
        });
      }
      for (const taxonomy of data.postTaxonomies) {
        await this.taxonomyRelationshipModel.create({
          objectId: data.newPostId,
          taxonomyId: taxonomy
        }, {
          transaction: t
        });
      }
      for (const tag of data.postTags) {
        const result = await this.taxonomyService.checkTaxonomySlugExist(tag, TaxonomyType.TAG);
        let taxonomyId = getUuid();
        if (result.taxonomy) {
          taxonomyId = result.taxonomy.taxonomyId;
          latestTags.push(taxonomyId);
        } else {
          await this.taxonomyModel.create({
            taxonomyId,
            type: TaxonomyType.TAG,
            name: tag,
            slug: tag,
            description: tag,
            count: 1
          }, {
            transaction: t
          });
        }
        await this.taxonomyRelationshipModel.create({
          objectId: data.newPostId,
          taxonomyId: taxonomyId
        }, {
          transaction: t
        });
      }

      /* update object count */
      latestTaxonomies = latestTaxonomies.concat(latestTags);
      const shouldIncrement = difference(latestTaxonomies, previousTaxonomies);
      const shouldDecrement = difference(previousTaxonomies, latestTaxonomies);
      if (shouldIncrement.length > 0) {
        await this.taxonomyModel.increment({ count: 1 }, {
          where: {
            taxonomyId: shouldIncrement
          },
          transaction: t
        });
      }
      if (shouldDecrement.length > 0) {
        await this.taxonomyModel.decrement({ count: 1 }, {
          where: {
            taxonomyId: shouldDecrement
          },
          transaction: t
        });
      }
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '内容保存失败',
        data: data,
        stack: err.stack
      });
      return Promise.resolve(false);
    });
  }

  async deletePosts(postIds: string[]): Promise<boolean> {
    /* soft delete */
    return this.sequelize.transaction(async (t) => {
      await this.postModel.update({
        postStatus: PostStatus.TRASH
      }, {
        where: {
          postId: {
            [Op.in]: postIds
          }
        },
        transaction: t
      });
      /* 同时删除内容所关联的分类和标签 */
      await this.taxonomyRelationshipModel.destroy({
        where: {
          objectId: {
            [Op.in]: postIds
          }
        },
        transaction: t
      });
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '内容删除失败',
        data: postIds,
        stack: err.stack
      });
      return Promise.resolve(false);
    });
  }
}
