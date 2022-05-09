import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { difference, uniq } from 'lodash';
import { CountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { GroupedCountResultItem, ProjectionAlias } from 'sequelize/types/model';
import { CommentStatus, PostStatus, PostType, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { POST_EXCERPT_LENGTH } from '../../common/constants';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { PostDto, PostFileDto } from '../../dtos/post.dto';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { filterHtmlTag, getUuid, truncateString } from '../../helpers/helper';
import { CommentModel } from '../../models/comment.model';
import { PostMetaModel } from '../../models/post-meta.model';
import { PostModel } from '../../models/post.model';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { UserModel } from '../../models/user.model';
import { VPostViewAverageModel } from '../../models/v-post-view-average.model';
import { LoggerService } from '../logger/logger.service';
import { OptionService } from '../option/option.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { PostMetaVo } from './post-meta.interface';
import { PostMetaService } from './post-meta.service';
import { PostArchivesQueryParam, PostListVo, PostQueryParam, PostVo } from './post.interface';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(PostModel)
    private readonly postModel: typeof PostModel,
    @InjectModel(VPostViewAverageModel)
    private readonly postView: typeof VPostViewAverageModel,
    @InjectModel(TaxonomyModel)
    private readonly taxonomyModel: typeof TaxonomyModel,
    @InjectModel(TaxonomyRelationshipModel)
    private readonly taxonomyRelationshipModel: typeof TaxonomyRelationshipModel,
    @InjectModel(PostMetaModel)
    private readonly postMetaModel: typeof PostMetaModel,
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel,
    private readonly optionService: OptionService,
    private readonly postMetaService: PostMetaService,
    private readonly taxonomyService: TaxonomyService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
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
      const tags = matched.filter((item) => item.taxonomyType === TaxonomyType.TAG);
      const categories = matched.filter((item) => item.taxonomyType === TaxonomyType.POST);

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
          [Op.eq]: PostStatus.PUBLISH
        },
        postType: {
          [Op.eq]: PostType.POST
        }
      },
      order: [
        ['postModified', 'desc'],
        ['postDate', 'desc']
      ],
      limit: 10,
      offset: 0
    }).catch((e) => {
      this.logger.error({
        message: e.message || '最新文章查询失败',
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getRandomPosts(): Promise<PostModel[]> {
    return this.postModel.findAll({
      attributes: ['postId', 'postTitle', 'postGuid'],
      where: {
        postStatus: {
          [Op.eq]: PostStatus.PUBLISH
        },
        postType: {
          [Op.eq]: PostType.POST
        }
      },
      order: [
        [Sequelize.fn('rand'), 'asc']
      ],
      limit: 10,
      offset: 0
    }).catch((e) => {
      this.logger.error({
        message: e.message || '随机文章查询失败',
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getHotPosts(): Promise<VPostViewAverageModel[]> {
    return this.postView.findAll({
      attributes: ['postId', 'postTitle', 'postGuid'],
      where: {
        postStatus: {
          [Op.eq]: PostStatus.PUBLISH
        },
        postType: {
          [Op.eq]: PostType.POST
        }
      },
      order: [
        ['viewsAverage', 'desc']
      ],
      limit: 10,
      offset: 0
    }).catch((e) => {
      this.logger.error({
        message: e.message || '热门文章查询失败',
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getArchives(param: PostArchivesQueryParam): Promise<PostModel[]> {
    const { postType, status, limit, showCount, isAdmin, fromAdmin } = param;
    const queryOpt: FindOptions = {
      attributes: [
        [Sequelize.fn('date_format', Sequelize.col('post_date'), '%Y/%m'), 'dateText'],
        [Sequelize.fn('date_format', Sequelize.col('post_date'), '%Y年%m月'), 'dateTitle']
      ],
      where: {
        postStatus: {
          [Op.in]: [PostStatus.PUBLISH, PostStatus.PASSWORD]
        },
        postType: {
          [Op.eq]: postType
        }
      },
      include: [{
        model: TaxonomyModel,
        through: { attributes: [] },
        attributes: ['taxonomyStatus'],
        where: {
          taxonomyStatus: isAdmin ? [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE] : [TaxonomyStatus.PUBLISH]
        },
        required: false
      }],
      group: ['dateText'],
      order: [['postDate', 'desc']]
    };
    if (fromAdmin) {
      if (status && status.length > 0) {
        queryOpt.where['postStatus'][Op.in] = status.includes(PostStatus.DRAFT)
          ? uniq(status.concat([PostStatus.DRAFT, PostStatus.AUTO_DRAFT])) : status;
      } else {
        queryOpt.where['postStatus'][Op.in] = [
          PostStatus.PUBLISH, PostStatus.PASSWORD, PostStatus.PRIVATE,
          PostStatus.DRAFT, PostStatus.AUTO_DRAFT, PostStatus.TRASH
        ];
      }
    }
    if (showCount) {
      (queryOpt.attributes as (string | ProjectionAlias)[]).push([
        Sequelize.fn('count', Sequelize.fn('distinct', Sequelize.col('post_id'))), 'count'
      ]);
    }
    return this.postModel.findAll(queryOpt).then((result) => {
      // 0 is no limit, and default is 10
      if (limit !== 0) {
        // todo: limit will location in from(sub query)
        return result.slice(0, limit || 10);
      }
      return result;
    }).catch((e) => {
      this.logger.error({
        message: e.message || '归档查询失败',
        data: param,
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getPosts(param: PostQueryParam): Promise<PostListVo> {
    const {
      isAdmin,
      keyword,
      fromAdmin,
      subTaxonomyIds,
      tag,
      year,
      month,
      status,
      commentFlag,
      author,
      orders
    } = param;
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
      attributes: ['taxonomyId', 'taxonomyStatus'],
      where: {
        taxonomyType: {
          [Op.in]: [TaxonomyType.POST]
        },
        taxonomyStatus: {
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
      includeOpt[0].where['taxonomyType'] = {
        [Op.in]: postType === PostType.POST ? [TaxonomyType.POST, TaxonomyType.TAG] : [TaxonomyType.TAG]
      };
      includeOpt[0].where['taxonomySlug'] = {
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
    const excludeAttrs = ['postPassword', 'postParent', 'postMimeType'];
    if (!fromAdmin) {
      excludeAttrs.push('postCreated');
    }
    const queryOpt: FindOptions = {
      where,
      attributes: {
        exclude: excludeAttrs
      },
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
    try {
      const total = await this.postModel.count(countOpt);
      const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);
      queryOpt.offset = pageSize * (page - 1);

      const posts = await this.postModel.findAll(queryOpt);
      posts.forEach(
        (post) => {
          if (!fromAdmin) {
            post.postExcerpt = post.postExcerpt || truncateString(filterHtmlTag(post.postContent), POST_EXCERPT_LENGTH);
            post.postContent = '';
          }
        }
      );

      const postIds: string[] = posts.map((post) => post.postId);
      const taxonomies = await this.taxonomyService.getTaxonomiesByPostIds(postIds, isAdmin);
      const postMeta = await this.postMetaService.getPostMetaByPostIds(postIds);

      return {
        posts: this.assemblePostData(posts, postMeta, taxonomies),
        page,
        total
      };
    } catch (e) {
      this.logger.error({
        message: e.message || '文章查询失败',
        data: param,
        stack: e.stack
      });
      throw new DbQueryErrorException();
    }
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
      attributes: {
        exclude: ['postPassword', 'postParent', 'postMimeType']
      },
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
        attributes: {
          exclude: ['taxonomyCreated', 'taxonomyModified']
        },
        where: {
          [Op.or]: [{
            taxonomyType: TaxonomyType.POST,
            taxonomyStatus: isAdmin ? [TaxonomyStatus.PRIVATE, TaxonomyStatus.PUBLISH] : TaxonomyStatus.PUBLISH
          }, {
            taxonomyType: TaxonomyType.TAG,
            taxonomyStatus: TaxonomyStatus.PUBLISH
          }]
        },
        // force using left join
        required: false
      }],
      where
    }).catch((e) => {
      this.logger.error({
        message: e.message || '文章查询失败',
        data: { postId, isAdmin },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getPostByGuid(postGuid: string, isAdmin: boolean): Promise<PostModel> {
    let where: WhereOptions = {
      postGuid: {
        [Op.eq]: decodeURIComponent(postGuid)
      },
      postType: {
        [Op.in]: [PostType.POST, PostType.PAGE, PostType.ATTACHMENT]
      }
    };
    if (!isAdmin) {
      where.postStatus = {
        [Op.in]: [PostStatus.PUBLISH, PostStatus.PASSWORD]
      };
    }
    return this.postModel.findOne({
      attributes: {
        exclude: ['postPassword', 'postParent', 'postMimeType']
      },
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
        attributes: {
          exclude: ['taxonomyCreated', 'taxonomyModified']
        },
        where: {
          taxonomyType: TaxonomyType.TAG,
          taxonomyStatus: TaxonomyStatus.PUBLISH
        },
        // force using left join
        required: false
      }],
      where
    }).catch((e) => {
      this.logger.error({
        message: e.message || '文章查询失败',
        data: { postGuid, isAdmin },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async increasePostView(postId: string) {
    return this.postModel.increment({ postViewCount: 1 }, {
      where: {
        postId
      }
    }).catch((e) => {
      this.logger.error({
        message: e.message || '文章查询失败',
        data: { postId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
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
    }).catch((e) => {
      this.logger.error({
        message: e.message || '上一篇文章查询失败',
        data: { postId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
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
    }).catch((e) => {
      this.logger.error({
        message: e.message || '下一篇文章查询失败',
        data: { postId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async checkPostsExistByGuid(guid: string | string[], postId?: string): Promise<boolean> {
    // 检查范围：全部，包含已删除和草稿
    const where: WhereOptions = {
      postGuid: guid
    };
    if (postId) {
      where.postId = {
        [Op.ne]: postId
      };
    }
    return this.postModel.count({ where }).then((total) => total > 0).catch((e) => {
      this.logger.error({
        message: e.message || '文章Guid是否存在查询失败',
        data: { guid, postId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async checkPostExist(postId: string): Promise<boolean> {
    return this.postModel.count({
      where: {
        postId: {
          [Op.eq]: postId
        }
      }
    }).then((total) => total > 0).catch((e) => {
      this.logger.error({
        message: e.message || '文章是否存在查询失败',
        data: { postId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async saveFiles(files: PostFileDto[]): Promise<PostModel[]> {
    return this.postModel.bulkCreate<PostModel>(files as any[]).catch((e) => {
      this.logger.error({
        message: e.message || '文件保存失败',
        data: { files },
        stack: e.stack
      });
      throw new DbQueryErrorException(Message.FILE_UPLOAD_ERROR, ResponseCode.UPLOAD_ERROR);
    });
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
        if (result.isExist) {
          taxonomyId = result.taxonomy.taxonomyId;
          latestTags.push(taxonomyId);
        } else {
          await this.taxonomyModel.create({
            taxonomyId,
            taxonomyType: TaxonomyType.TAG,
            taxonomyName: tag,
            taxonomySlug: tag,
            taxonomyDescription: tag,
            objectCount: 1
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
        await this.taxonomyModel.increment({ objectCount: 1 }, {
          where: {
            taxonomyId: shouldIncrement
          },
          transaction: t
        });
      }
      if (shouldDecrement.length > 0) {
        await this.taxonomyModel.decrement({ objectCount: 1 }, {
          where: {
            taxonomyId: shouldDecrement
          },
          transaction: t
        });
      }
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '文章保存失败',
        data: data,
        stack: e.stack
      });
      throw new DbQueryErrorException(Message.POST_SAVE_ERROR, ResponseCode.POST_SAVE_ERROR);
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
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '文章删除失败',
        data: { postIds },
        stack: e.stack
      });
      throw new DbQueryErrorException(Message.POST_DELETE_ERROR, ResponseCode.POST_DELETE_ERROR);
    });
  }

  async countPostsByType(): Promise<GroupedCountResultItem[]> {
    return this.postModel.count({
      where: {
        postStatus: [PostStatus.PUBLISH, PostStatus.PASSWORD, PostStatus.PRIVATE],
        postType: [PostType.POST, PostType.PAGE, PostType.ATTACHMENT]
      },
      group: ['postType']
    }).catch((e) => {
      this.logger.error({
        message: e.message || '文章总数查询失败',
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async updateCommentCountByComments(commentIds: string[]): Promise<boolean> {
    const comments = await this.commentModel.findAll({
      attributes: ['postId'],
      where: {
        commentId: commentIds
      }
    }).catch((e) => {
      this.logger.error({
        message: e.message || '评论查询失败',
        data: { commentIds },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
    const postIds: string[] = uniq(comments.map((item) => item.postId));
    return this.postModel.update({
      commentCount: Sequelize.literal(
        `(select count(1) total from comments where comments.post_id = posts.post_id` +
        ` and comments.comment_status='${CommentStatus.NORMAL}')`
      )
    }, {
      where: {
        postId: postIds
      },
      silent: true
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '评论数量更新失败',
        data: { commentIds },
        stack: e.stack
      });
      throw new DbQueryErrorException(Message.POST_COMMENT_COUNT_UPDATE_ERROR);
    });
  }
}
