import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import { CountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PostMetaService } from './post-meta.service';
import { LoggerService } from '../logger/logger.service';
import { OptionsService } from '../option/options.service';
import { PaginatorService } from '../paginator/paginator.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { CopyrightType, CopyrightTypeDesc, PostStatus, PostStatusDesc, PostType, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { POST_EXCERPT_LENGTH } from '../../common/constants';
import { ResponseCode } from '../../common/response-code.enum';
import { PostDto, PostFileDto } from '../../dtos/post.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { cutStr, filterHtmlTag, getEnumKeyByValue, getEnumValues, getUuid } from '../../helpers/helper';
import { PostListVo, PostStatusMap, PostVo } from '../../interfaces/posts.interface';
import { PostMetaVo } from '../../interfaces/post-meta.interface';
import { PostModel } from '../../models/post.model';
import { PostMetaModel } from '../../models/post-meta.model';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { TaxonomyRelationshipModel } from '../../models/taxonomy-relationship.model';
import { UserModel } from '../../models/user.model';
import { VPostViewAverageModel } from '../../models/v-post-view-average.model';
import { VPostDateArchiveModel } from '../../models/v-post-date-archive.model';

@Injectable()
export class PostsService {
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
    private readonly logger: LoggerService,
    private readonly optionsService: OptionsService,
    private readonly paginatorService: PaginatorService,
    private readonly postMetaService: PostMetaService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly sequelize: Sequelize
  ) {
  }

  getAllPostStatus(): PostStatusMap[] {
    const status: PostStatusMap[] = [];
    Object.keys(PostStatus).forEach((key) => {
      status.push({
        name: PostStatus[key],
        desc: PostStatusDesc[key]
      });
    });
    return status;
  }

  transformArchiveDate(archiveDates: VPostDateArchiveModel[]) {
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

  assemblePostData(param: { posts: PostModel[], postMeta: PostMetaModel[], taxonomies: TaxonomyModel[] }): PostVo[] {
    const { posts, postMeta, taxonomies } = param;
    const postList = [];
    posts.forEach((post) => {
      const meta: Record<string, string> = {};
      postMeta.forEach((u, i) => {
        if (u.postId === post.postId) {
          meta[u.metaKey] = u.metaValue;
          // decrease iterate times
          postMeta.splice(i, 1);
        }
      });
      meta.postAuthor = meta['post_author'] || post.author.userNiceName;

      const tags = [];
      const categories = [];
      taxonomies.forEach((t) => {
        if (t.type === 'tag') {
          t.taxonomyRelationships.forEach((r) => {
            if (r.objectId === post.postId) {
              tags.push(t);
            }
          });
        } else {
          t.taxonomyRelationships.forEach((r) => {
            if (r.objectId === post.postId) {
              categories.push(t);
            }
          });
        }
      });
      postList.push({
        post,
        meta,
        tags,
        categories
      });
    });
    return postList;
  }

  transformCopyright(type: number | string): string {
    type = typeof type === 'string' ? parseInt(type) : type;
    type = isNaN(type) ? CopyrightType.AUTHORIZED : type;
    if (!getEnumValues(CopyrightType).includes(type)) {
      throw new CustomException('数据错误。', HttpStatus.INTERNAL_SERVER_ERROR, ResponseCode.COPYRIGHT_ILLEGAL);
    }
    return CopyrightTypeDesc[getEnumKeyByValue(CopyrightType, type)];
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

  async getArchiveDates(
    {
      postType = PostType.POST,
      showCount = false,
      isAdmin = false,
      limit = 10
    }
  ): Promise<VPostDateArchiveModel[]> {
    const queryOpt: any = {
      attributes: ['dateText', 'dateTitle'],
      where: {
        postStatus: {
          [Op.eq]: 'publish'
        },
        postType: {
          [Op.eq]: postType
        }
      },
      group: ['dateText'],
      order: [['dateText', 'desc']]
    };
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

  async getTaxonomiesAndPostMetaByPosts(postIds: string[], isAdmin?: boolean) {
    return Promise.all([
      this.postMetaService.getPostMetaByPostIds(postIds),
      this.taxonomiesService.getTaxonomiesByPostIds({
        postIds, isAdmin
      })
    ]).then((results) => {
      return Promise.resolve({
        postMeta: results[0],
        taxonomies: results[1]
      });
    });
  }

  async getPosts(param: {
    page: number,
    isAdmin: boolean,
    postType?: PostType,
    from?: string,
    keyword?: string,
    subTaxonomyIds?: string[],
    tag?: string;
    year?: string;
    month?: string;
    status?: PostStatus;
    author?: string;
  }): Promise<PostListVo> {
    const { isAdmin, keyword, from, subTaxonomyIds, tag, year, month, status, author } = param;
    const pageSize = this.paginatorService.getPageSize();
    const postType = param.postType || PostType.POST;
    const where = {
      postStatus: {
        [Op.in]: ['publish']
      },
      postType: {
        [Op.eq]: postType
      }
    };
    if (isAdmin && from === 'admin') {
      if (status) {
        where.postStatus[Op.eq] = status === 'draft' ? [PostStatus.DRAFT, PostStatus.AUTO_DRAFT] : status;
      } else {
        where.postStatus[Op.eq] = [PostStatus.PUBLISH, PostStatus.PRIVATE, PostStatus.DRAFT, PostStatus.AUTO_DRAFT, PostStatus.TRASH];
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
    if (postType === PostType.POST) {
      includeOpt.push({
        model: TaxonomyModel,
        through: { attributes: []},
        attributes: ['taxonomyId', 'status'],
        where: {
          type: {
            [Op.eq]: TaxonomyType.POST
          },
          status: {
            [Op.in]: isAdmin ? [0, 1] : [1]
          }
        }
      });
      if (tag) {
        includeOpt[0].where = {
          type: {
            [Op.eq]: TaxonomyType.TAG
          },
          status: {
            [Op.eq]: TaxonomyStatus.OPEN
          },
          slug: {
            [Op.eq]: tag
          }
        };
      }
    }
    if (subTaxonomyIds && subTaxonomyIds.length > 0) {
      includeOpt.push({
        model: TaxonomyRelationshipModel,
        attributes: ['objectId'],
        where: {
          termTaxonomyId: {
            [Op.in]: subTaxonomyIds
          }
        }
      });
    }
    const queryOpt: FindOptions = {
      where,
      attributes: [
        'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus',
        'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'
      ],
      include: [{
        model: UserModel,
        attributes: ['userNiceName']
      }, {
        model: PostMetaModel,
        attributes: ['postId', 'metaKey', 'metaValue']
      }],
      order: [['postCreated', 'desc'], ['postDate', 'desc']],
      limit: pageSize,
      subQuery: false
    };

    const countOpt: CountOptions = {
      where,
      distinct: true
    };
    if (postType === 'post') {
      queryOpt.include = (queryOpt.include as IncludeOptions[]).concat(includeOpt);
      queryOpt.group = ['postId'];
      countOpt.include = includeOpt;
    }
    const count = await this.postModel.count(countOpt);
    const page = Math.max(Math.min(param.page, Math.ceil(count / pageSize)), 1);
    queryOpt.offset = pageSize * (page - 1);

    const posts = await this.postModel.findAll(queryOpt);
    const postIds: string[] = [];
    posts.forEach((post) => {
      postIds.push(post.postId);
      // todo: time format changes to config
      post.postDateText = moment(post.postDate).format('YYYY-MM-DD');
      post.postCreatedText = moment(post.postCreated).format('YYYY-MM-DD HH:mm');
      post.postModifiedText = moment(post.postModified || post.postCreated).format('YYYY-MM-DD HH:mm');
      post.postExcerpt = post.postExcerpt || cutStr(filterHtmlTag(post.postContent), POST_EXCERPT_LENGTH);
      post.postStatusDesc = PostStatusDesc[getEnumKeyByValue(PostStatus, post.postStatus)];
    });
    const { postMeta, taxonomies } = await this.getTaxonomiesAndPostMetaByPosts(postIds, isAdmin);

    return {
      posts: this.assemblePostData({ posts, postMeta, taxonomies }),
      postIds,
      page,
      count
    };
  }

  async getPostById(postId: string, isAdmin?: boolean): Promise<PostModel> {
    let where = {
      [Op.or]: [{
        taxonomy: TaxonomyType.POST,
        status: isAdmin ? [TaxonomyStatus.CLOSED, TaxonomyStatus.OPEN] : TaxonomyStatus.OPEN
      }, {
        taxonomy: TaxonomyType.TAG,
        status: TaxonomyStatus.OPEN
      }]
    };
    return this.postModel.findByPk(postId, {
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
        where,
        // force to use left join
        required: false
      }]
    }).then((post) => {
      // todo: to be removed
      if (post) {
        post.postDateText = moment(post.postDate).format('YYYY-MM-DD');
        post.postModifiedText = moment(post.postModified || post.postCreated).format('YYYY-MM-DD HH:mm');
        post.postMetaMap = {};
        post.postMeta.forEach((meta) => {
          post.postMetaMap[meta.metaKey] = meta.metaValue;
        });
      }
      return Promise.resolve(post);
    });
  }

  async getPostBySlug(postSlug: string): Promise<PostModel> {
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
      where: {
        postGuid: {
          [Op.eq]: decodeURIComponent(postSlug)
        },
        postType: {
          [Op.in]: ['post', 'page']
        }
      }
    }).then((post) => {
      if (post) {
        post.postDateText = moment(post.postDate).format('YYYY-MM-DD');
        post.postModifiedText = moment(post.postModified || post.postCreated).format('YYYY-MM-DD HH:mm');
      }
      return Promise.resolve(post);
    });
  }

  async incrementPostView(postId: string) {
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
    const count = await this.postModel.count({
      where
    });

    return count > 0;
  }

  async checkPostExist(postId: string): Promise<boolean> {
    const count = await this.postModel.count({
      where: {
        postId: {
          [Op.eq]: postId
        }
      }
    });
    return count > 0;
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
      for (let postMeta of data.postMeta) {
        await this.postMetaModel.create({ ...postMeta }, {
          transaction: t
        });
      }
      for (let taxonomy of data.postTaxonomies) {
        await this.taxonomyRelationshipModel.create({
          objectId: data.newPostId,
          termTaxonomyId: taxonomy
        }, {
          transaction: t
        });
      }
      for (let tag of data.postTags) {
        const result = await this.taxonomiesService.checkTaxonomySlugExist(tag, TaxonomyType.TAG);
        let taxonomyId = getUuid();
        if (result.taxonomy) {
          taxonomyId = result.taxonomy.taxonomyId;
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
          termTaxonomyId: taxonomyId
        }, {
          transaction: t
        });
      }
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '内容保存失败。',
        data: data,
        stack: err.stack
      });
      return Promise.resolve(false);
    });
  }
}
