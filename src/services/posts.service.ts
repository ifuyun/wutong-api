import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import Sequelize, { CountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import PaginatorService from './paginator.service';
import PostMetaService from './post-meta.service';
import TaxonomiesService from './taxonomies.service';
import { POST_EXCERPT_LENGTH } from '../common/constants';
import { cutStr, filterHtmlTag } from '../helpers/helper';
import { PostListVo, PostStatusMap, PostVo } from '../interfaces/posts.interface';
import PostModel from '../models/post.model';
import PostMetaModel from '../models/post-meta.model';
import TaxonomyModel from '../models/taxonomy.model';
import TaxonomyRelationshipModel from '../models/taxonomy-relationship.model';
import UserModel from '../models/user.model';
import VPostViewAverageModel from '../models/v-post-view-average.model';
import VPostDateArchiveModel from '../models/v-post-date-archive.model';
import { PostStatus } from '../common/enums';

@Injectable()
export default class PostsService {
  constructor(
    @InjectModel(PostModel)
    private readonly postModel: typeof PostModel,
    @InjectModel(VPostViewAverageModel)
    private readonly postView: typeof VPostViewAverageModel,
    @InjectModel(VPostDateArchiveModel)
    private readonly postArchiveView: typeof VPostDateArchiveModel,
    private readonly paginatorService: PaginatorService,
    private readonly postMetaService: PostMetaService,
    private readonly taxonomiesService: TaxonomiesService
  ) {
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

  async getRandPosts(): Promise<PostModel[]> {
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

  async getArchiveDates(param: { postType: string, showCount?: boolean, isAdmin?: boolean, limit?: number }): Promise<VPostDateArchiveModel[]> {
    const postType = param.postType || 'post';
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
    if (param.limit !== 0) {
      queryOpt.limit = param.limit || 10;
      queryOpt.offset = 0;
    }
    if (param.showCount) {
      queryOpt.attributes.push([Sequelize.fn('count', 1), 'count']);
      queryOpt.group = ['dateText', 'status'];
      if (!param.isAdmin) {
        queryOpt.having = {
          status: {
            [Op.eq]: 1
          }
        };
      }
    }
    return this.postArchiveView.findAll(queryOpt);
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

  async getPosts(param: {
    page: number,
    isAdmin: boolean,
    postType?: string,
    from?: string,
    keyword?: string,
    subTaxonomyIds?: string[],
    tag?: string;
    year?: string;
    month?: string;
    status?: string;
    author?: string;
  }): Promise<PostListVo> {
    const { isAdmin, keyword, postType, from, subTaxonomyIds, tag, year, month, status, author } = param;
    const pageSize = this.paginatorService.getPageSize();
    const where = {
      postStatus: {
        [Op.in]: ['publish']
      },
      postType: {
        [Op.eq]: postType || 'post'
      }
    };
    if (isAdmin && from === 'admin') {
      if (status) {
        where.postStatus[Op.in] = status === 'draft' ? ['draft', 'auto-draft'] : [status];
      } else {
        where.postStatus[Op.in] = ['publish', 'private', 'draft', 'auto-draft', 'trash'];
      }
    }
    if (keyword) {
      where[Op.or] = [{
        postTitle: {
          [Op.like]: `%${param.keyword}%`
        }
      }, {
        postContent: {
          [Op.like]: `%${param.keyword}%`
        }
      }, {
        postExcerpt: {
          [Op.like]: `%${param.keyword}%`
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
    const includeOpt: IncludeOptions[] = [{
      model: TaxonomyModel,
      attributes: ['taxonomyId', 'status'],
      where: {
        type: {
          [Op.eq]: 'post'
        },
        status: {
          [Op.in]: isAdmin ? [0, 1] : [1]
        }
      }
    }];
    if (tag) {
      includeOpt[0].where = {
        type: {
          [Op.eq]: 'tag'
        },
        status: {
          [Op.eq]: 1
        },
        slug: {
          [Op.eq]: tag
        }
      };
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
      post.postStatusDesc = PostStatus[post.postStatus];
    });
    const { postMeta, taxonomies } = await this.getTaxonomiesAndPostMetaByPosts(postIds, isAdmin);

    return {
      posts: this.assemblePostData({ posts, postMeta, taxonomies }),
      postIds,
      page,
      count
    };
  }

  async getPostById(postId: string, isAdmin: boolean): Promise<PostModel> {
    let where = {
      [Op.or]: [{
        taxonomy: {
          [Op.eq]: 'post'
        }
      }, {
        taxonomy: {
          [Op.eq]: 'tag'
        },
        status: {
          [Op.eq]: 1
        }
      }]
    };
    if (!isAdmin) {
      where[Op.or][0].status = {
        [Op.eq]: 1
      };
    }
    return this.postModel.findByPk(postId, {
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
        model: TaxonomyModel,
        as: 'taxonomies',
        attributes: ['taxonomyId', 'type', 'name', 'slug', 'description', 'parent', 'termOrder', 'status', 'count'],
        where
      }, {
        model: PostMetaModel,
        as: 'postMeta',
        attributes: ['metaKey', 'metaValue']
      }]
    }).then((post) => {
      if (post) {
        post.postDateText = moment(post.postDate).format('YYYY-MM-DD');
        post.postModifiedText = moment(post.postModified || post.postCreated).format('YYYY-MM-DD HH:mm');
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
    this.postModel.increment({ postViewCount: 1 }, {
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

  transformCopyright(type: number | string): string {
    const defaultType = '1';
    if (typeof type !== 'number' && typeof type !== 'string') {
      type = defaultType;
    }
    type = type.toString();
    if (!['0', '1', '2'].includes(type)) {
      type = defaultType;
    }
    const copyrightMap = {
      '0': '禁止转载',
      '1': '转载需授权',
      '2': 'CC-BY-NC-ND'
    };
    return copyrightMap[type];
  }

  getAllPostStatus(): PostStatusMap[] {
    const status: PostStatusMap[] = [];
    Object.keys(PostStatus).forEach((key) => {
      status.push({
        name: key,
        desc: PostStatus[key]
      });
    });
    return status;
  }
}
