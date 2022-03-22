import { Controller, Get, Header, HttpStatus, Param, Query, Render, Req, Session, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { uniq as unique } from 'lodash';
import { PostStatus, PostType, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { POST_DESCRIPTION_LENGTH } from '../../common/constants';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IdParams } from '../../decorators/id-params.decorator';
import { IpAndAgent } from '../../decorators/ip-and-agent.decorator';
import { Ip } from '../../decorators/ip.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { User } from '../../decorators/user.decorator';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { CustomException } from '../../exceptions/custom.exception';
import { NotFoundException } from '../../exceptions/not-found.exception';
import { appendUrlRef, cutStr, filterHtmlTag } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { AuthUserEntity } from '../../interfaces/auth.interface';
import { CrumbEntity } from '../../interfaces/crumb.interface';
import { PostQueryParam } from '../../interfaces/posts.interface';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CommentsService } from '../comment/comments.service';
import { CrumbService } from '../crumb/crumb.service';
import { LoggerService } from '../logger/logger.service';
import { PaginatorService } from '../paginator/paginator.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { UtilService } from '../util/util.service';
import { PostCommonService } from './post-common.service';
import { PostsService } from './posts.service';

@Controller()
export class PostController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commonService: PostCommonService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly logger: LoggerService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService,
    private readonly commentsService: CommentsService,
    private readonly crumbService: CrumbService
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  @Get('api/posts')
  @Header('Content-Type', 'application/json')
  async getPosts(
    @Req() req: Request,
    @Query('page', new ParseIntPipe(1)) page: number,
    @Query('pageSize', new ParseIntPipe(10)) pageSize: number,
    @Query('category', new TrimPipe()) category: string,
    @Query('tag', new TrimPipe()) tag: string,
    @Query('year', new TrimPipe()) year: string,
    @Query('month', new ParseIntPipe()) month: number,
    @Query('status', new TrimPipe()) status: PostStatus,
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('orders', new TrimPipe()) orders: string[],
    @Query('from', new TrimPipe()) from: string,
    @IsAdmin() isAdmin: boolean
  ) {
    const param: PostQueryParam = {
      page,
      pageSize,
      postType: PostType.POST,
      tag,
      year,
      month: month ? month < 10 ? '0' + month : month.toString() : '',
      status,
      keyword,
      isAdmin,
      from
    };
    let crumbs: CrumbEntity[] = [];
    if (category) {
      const taxonomies = await this.taxonomiesService.getAllTaxonomies(isAdmin ? [0, 1] : 1);
      const taxonomyTree = this.taxonomiesService.generateTaxonomyTree(taxonomies);
      const result = await this.taxonomiesService.getSubTaxonomies({
        taxonomyData: taxonomies,
        taxonomyTree,
        slug: category
      });
      if (result.subTaxonomyIds.length < 1) {
        throw new NotFoundException();
      }
      param.subTaxonomyIds = result.subTaxonomyIds;
      crumbs = result.crumbs;
    }

    if (isAdmin && from === 'admin' && orders.length > 0) {
      /* 管理员，且，从后台访问，且，传递了排序参数 */
      param.orders = getQueryOrders({
        postViewCount: 1,
        commentCount: 2,
        postDate: 3,
        postCreated: 4,
        postModified: 5
      }, orders);
    }

    const postList = await this.postsService.getPosts(param);
    const commentCount = await this.commentsService.getCommentCountByPosts(postList.postIds);
    postList.posts.map((post) => {
      post.post.commentCount = commentCount[post.post.postId];
      return post;
    });
    return getSuccessResponse({ postList, crumbs });
  }

  @Get('api/posts/archive-dates')
  @Header('Content-Type', 'application/json')
  async getArchiveDates(
    @Query() query: Record<string, any>,
    @AuthUser() user: AuthUserEntity
  ) {
    const { postType, showCount, limit } = query;
    if (postType && ![PostType.POST, PostType.PAGE].includes(postType)) {
      throw new BadRequestException(Message.ILLEGAL_PARAM);
    }
    const params = {
      postType,
      showCount: showCount === '1' || showCount === 'true',
      isAdmin: user.isAdmin,
      limit: parseInt(limit, 10)
    };
    const dateList = await this.postsService.getArchiveDates(params);
    return getSuccessResponse(dateList);
  }

  @Get('api/posts/hot')
  @Header('Content-Type', 'application/json')
  async getHotPosts() {
    const posts = await this.postsService.getHotPosts();
    return getSuccessResponse(posts);
  }

  @Get('api/posts/random')
  @Header('Content-Type', 'application/json')
  async getRandomPosts() {
    const posts = await this.postsService.getRandomPosts();
    return getSuccessResponse(posts);
  }

  @Get('api/posts/recent')
  @Header('Content-Type', 'application/json')
  async getRecentPosts() {
    const posts = await this.postsService.getRecentPosts();
    return getSuccessResponse(posts);
  }

  @Get('api/posts/prev-and-next')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['postId'] })
  async getPrevAndNext(@Query('postId', new TrimPipe()) postId: string) {
    const prevPost = await this.postsService.getPrevPost(postId);
    const nextPost = await this.postsService.getNextPost(postId);

    return getSuccessResponse({ prevPost, nextPost });
  }

  @Get('api/posts/standalone')
  async getPostBySlug(@Query('slug', new TrimPipe()) slug: string) {
    // todo: move to validation
    const isLikePost = this.utilService.isUrlPathLikePostSlug(slug);
    if (!isLikePost) {
      throw new NotFoundException();
    }
    const post = await this.postsService.getPostBySlug(slug);
    if (!post) {
      throw new NotFoundException();
    }
    await this.postsService.incrementPostView(post.postId);

    const postMeta: Record<string, string> = {};
    post.postMeta.forEach((meta) => {
      postMeta[meta.metaKey] = meta.metaValue;
    });
    postMeta.copyrightType = this.postsService.transformCopyright(postMeta.copyright_type);
    postMeta.postAuthor = postMeta.post_author || post.author.userNiceName;

    return getSuccessResponse({
      post, meta: postMeta, tags: [], categories: [], crumbs: []
    });
  }

  @Get('api/posts/:postId')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInParams: ['postId'] })
  async getPost(
    @Param('postId') postId: string,
    @Query('from', new TrimPipe()) from: string,
    @IsAdmin() isAdmin: boolean
  ) {
    const post = await this.postsService.getPostById(postId, isAdmin);
    if (!post || !post.postId) {
      throw new CustomException({
        status: HttpStatus.NOT_FOUND,
        data: {
          code: ResponseCode.POST_NOT_FOUND,
          message: `Post: ${postId} is not exist.`
        }
      });
    }
    // 无管理员权限不允许访问非公开文章(包括草稿)
    if (!isAdmin && post.postStatus !== PostStatus.PUBLISH) {
      throw new CustomException({
        status: HttpStatus.NOT_FOUND,
        data: {
          code: ResponseCode.UNAUTHORIZED,
          message: Message.NOT_FOUND
        },
        log: {
          msg: `[Unauthorized]${post.postId}:${post.postTitle} is ${post.postStatus}`
        }
      });
    }

    let taxonomies: TaxonomyModel[] = [];
    post.taxonomies.forEach((v) => {
      if (v.type === TaxonomyType.POST) {
        taxonomies.push(v);
      }
    });
    if (taxonomies.length < 1) {
      throw new CustomException({
        status: HttpStatus.NOT_FOUND,
        data: {
          code: ResponseCode.TAXONOMY_NOT_FOUND,
          message: Message.NOT_FOUND
        },
        log: {
          msg: 'Taxonomy not exist.',
          data: {
            postId: post.postId,
            postTitle: post.postTitle
          }
        }
      });
    }
    await this.postsService.incrementPostView(postId);

    let crumbTaxonomyId;
    // todo: parent category
    const crumbTaxonomies = taxonomies.filter((item) => from.split('?')[0].endsWith(`/${item.slug}`));
    if (crumbTaxonomies.length > 0) {
      crumbTaxonomyId = crumbTaxonomies[0].taxonomyId;
    } else {
      crumbTaxonomyId = taxonomies[0].taxonomyId;
    }
    const allTaxonomies = await this.taxonomiesService.getAllTaxonomies(
      isAdmin ? [TaxonomyStatus.CLOSED, TaxonomyStatus.OPEN] : TaxonomyStatus.OPEN);
    const crumbs = this.taxonomiesService.getTaxonomyPath({
      taxonomyData: allTaxonomies,
      taxonomyId: crumbTaxonomyId
    });

    const postMeta: Record<string, string> = {};
    post.postMeta.forEach((meta) => {
      postMeta[meta.metaKey] = meta.metaValue;
    });
    postMeta.copyrightType = this.postsService.transformCopyright(postMeta.copyright_type);
    postMeta.postAuthor = postMeta.post_author || post.author.userNiceName;

    const tags: TaxonomyModel[] = [];
    const categories: TaxonomyModel[] = [];
    post.taxonomies.forEach((v) => {
      if (v.type === TaxonomyType.TAG) {
        tags.push(v);
      } else if (v.type === TaxonomyType.POST) {
        categories.push(v);
      }
    });

    return getSuccessResponse({
      post, meta: postMeta, tags, categories, crumbs
    });
  }

  @Get(['', '/+', 'post/page-:page'])
  @Render('home/pages/post-list')
  async showPosts(
    @Req() req: Request,
    @Param('page', new ParseIntPipe(1)) page: number,
    @Query() query: Record<string, any>,
    @Session() session: any,
    @Ip() ip: string,
    @UserAgent() agent: string,
    @IpAndAgent() accessInfo: string,
    @IsAdmin() isAdmin: boolean
  ) {
    const commonData = await this.commonService.getCommonData({
      from: 'list',
      page,
      isAdmin
    });
    const postList = await this.postsService.getPosts({
      page,
      postType: PostType.POST,
      isAdmin,
      keyword: query.keyword?.trim()
    });
    page = postList.page;
    const { posts, total, postIds } = postList;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const { options } = commonData;
    const siteDesc = this.utilService.getSiteDescription(options);
    const resData = {
      curNav: 'index',
      showCrumb: false,
      meta: {
        title: '',
        author: options.site_author,
        keywords: options.site_keywords,
        description: (page > 1 ? `${options.site_name}文章列表(第${page}页)。` : '') + siteDesc
      },
      // token: req.csrfToken(),
      ...commonData,
      posts,
      comments,
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, total),
        linkUrl: '/post/page-',
        linkParam: query.keyword ? '?keyword=' + query.keyword : ''
      }
    };
    const titles = [options.site_name];
    if (query.keyword) {
      titles.unshift('搜索结果');
      if (page > 1) {
        titles.unshift(`第${page}页`);
      }
      titles.unshift(query.keyword);
    } else {
      titles.unshift(options.site_slogan);
      if (page > 1) {
        titles.unshift(`第${page}页`);
      }
    }
    resData.meta.title = this.utilService.getTitle(titles);

    return resData;
  }

  @Get('post/:postId')
  @Render('home/pages/post')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInParams: ['postId'] })
  async showPost(
    @Req() req: Request,
    @Param('postId') postId: string,
    @Referer(true) referer: string,
    @User() user,
    @IsAdmin() isAdmin: boolean
  ) {
    const post = await this.postsService.getPostById(postId, isAdmin);
    if (!post || !post.postId) {
      throw new CustomException({
        status: HttpStatus.NOT_FOUND,
        data: {
          code: ResponseCode.POST_NOT_FOUND,
          message: `Post: ${postId} is not exist.`
        }
      });
    }
    // 无管理员权限不允许访问非公开文章(包括草稿)
    if (!isAdmin && post.postStatus !== PostStatus.PUBLISH) {
      throw new CustomException({
        status: HttpStatus.NOT_FOUND,
        data: {
          code: ResponseCode.UNAUTHORIZED,
          message: Message.NOT_FOUND
        },
        log: {
          msg: `[Unauthorized]${post.postId}:${post.postTitle} is ${post.postStatus}`
        }
      });
    }
    let taxonomies: TaxonomyModel[] = [];
    post.taxonomies.forEach((v) => {
      if (v.type === TaxonomyType.POST) {
        taxonomies.push(v);
      }
    });
    if (taxonomies.length < 1) {
      throw new CustomException({
        status: HttpStatus.NOT_FOUND,
        data: {
          code: ResponseCode.TAXONOMY_NOT_FOUND,
          message: Message.NOT_FOUND
        },
        log: {
          msg: 'Taxonomy not exist.',
          data: {
            postId: post.postId,
            postTitle: post.postTitle
          }
        }
      });
    }
    let crumbTaxonomyId;
    // todo: parent category
    const crumbTaxonomies = taxonomies.filter((item) => referer.endsWith(`/${item.slug}`));
    if (crumbTaxonomies.length > 0) {
      crumbTaxonomyId = crumbTaxonomies[0].taxonomyId;
    } else {
      crumbTaxonomyId = taxonomies[0].taxonomyId;
    }
    const commonData = await this.commonService.getCommonData({
      from: 'post',
      isAdmin
    });
    const { comments, prevPost, nextPost, crumbs } = await Promise.all([
      this.commentsService.getCommentsByPostId(postId),
      this.taxonomiesService.getTaxonomyPath({
        taxonomyData: commonData.taxonomies.taxonomyData,
        taxonomyId: crumbTaxonomyId
      }),
      this.postsService.getPrevPost(postId),
      this.postsService.getNextPost(postId),
      this.postsService.incrementPostView(postId)
    ]).then((results) => {
      return Promise.resolve({
        comments: results[0],
        crumbs: results[1],
        prevPost: results[2],
        nextPost: results[3]
      });
    });

    const postMeta: Record<string, string | number> = post.postMetaMap;
    postMeta.copyright_type_text = this.postsService.transformCopyright(postMeta.copyright_type);
    postMeta.postAuthor = postMeta.post_author || post.author.userNiceName;

    const { options } = commonData;
    const resData = {
      curNav: crumbs[0].slug,
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: this.utilService.getTitle([post.postTitle, options.site_name]),
        description: post.postExcerpt || cutStr(filterHtmlTag(post.postContent), POST_DESCRIPTION_LENGTH),
        author: options.site_author,
        keywords: options.site_keywords
      },
      // token: req.csrfToken(),
      ...commonData,
      user: {
        userName: '',
        userEmail: ''
      },
      post,
      postMeta,
      postTaxonomies: [],
      postTags: [],
      comments, prevPost, nextPost,
      urlShare: appendUrlRef(options.site_url, post.postGuid, 'qrcode')
    };
    const keywords = [];
    post.taxonomies.forEach((v) => {
      if (v.type === 'tag') {
        keywords.push(v.name);
        resData.postTags.push(v);
      } else if (v.type === 'post') {
        resData.postTaxonomies.push(v);
      }
    });
    keywords.push(options.site_keywords);
    resData.meta.keywords = unique(keywords).join(',');

    if (user) {
      resData.user.userName = user.userNiceName;
      resData.user.userEmail = user.userEmail;
    }
    return resData;
  }

  @Get(['category/:category', 'category/:category/page-:page'])
  @Render('home/pages/post-list')
  async showPostsByTaxonomy(
    @Req() req: Request,
    @Param('page', new ParseIntPipe(1)) page: number,
    @Param('category') category: string,
    @IsAdmin() isAdmin: boolean
  ) {
    // todo: should check if category is exist
    const commonData = await this.commonService.getCommonData({
      from: 'category',
      isAdmin
    });
    const { taxonomies } = commonData;
    const { subTaxonomyIds, crumbs } = await this.taxonomiesService.getSubTaxonomies({
      taxonomyData: taxonomies.taxonomyData,
      taxonomyTree: taxonomies.taxonomyTree,
      slug: category
    });
    if (subTaxonomyIds.length < 1) {
      throw new NotFoundException();
    }
    const postList = await this.postsService.getPosts({
      page,
      postType: PostType.POST,
      isAdmin,
      subTaxonomyIds
    });
    const { posts, total, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const { options } = commonData;
    const curTaxonomyName = crumbs[crumbs.length - 1].label;
    const siteDesc = this.utilService.getSiteDescription(options);
    const resData = {
      curNav: crumbs[0].slug,
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: '',
        description: `「${curTaxonomyName}」相关文章` + (page > 1 ? `(第${page}页)` : '') + '。' + siteDesc,
        author: options.site_author,
        keywords: unique(`${curTaxonomyName},${options.site_keywords}`.split(',')).join(',')
      },
      // token: req.csrfToken(),
      ...commonData,
      posts,
      comments,
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, total),
        linkUrl: '/category/' + category + '/page-',
        linkParam: ''
      }
    };
    const titles = [curTaxonomyName, '分类目录', options.site_name];
    if (page > 1) {
      titles.unshift(`第${page}页`);
    }
    resData.meta.title = this.utilService.getTitle(titles);

    return resData;
  }

  @Get(['tag/:tag', 'tag/:tag/page-:page'])
  @Render('home/pages/post-list')
  async showPostsByTag(
    @Req() req: Request,
    @Param('page', new ParseIntPipe(1)) page: number,
    @Param('tag') tag: string,
    @IsAdmin() isAdmin: boolean
  ) {
    const commonData = await this.commonService.getCommonData({
      from: 'tag',
      isAdmin
    });
    const postList = await this.postsService.getPosts({
      page,
      postType: PostType.POST,
      isAdmin,
      tag
    });
    const { posts, total, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const { options } = commonData;
    const siteDesc = this.utilService.getSiteDescription(options);
    const crumbs: CrumbEntity[] = [{
      'label': '标签',
      'tooltip': '标签',
      'url': '',
      'headerFlag': false
    }, {
      'label': tag,
      'tooltip': tag,
      'url': '/tag/' + tag,
      'headerFlag': true
    }];
    const resData = {
      curNav: 'tag',
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: '',
        description: `「${tag}」相关文章` + (page > 1 ? `(第${page}页)` : '') + '。' + siteDesc,
        author: options.site_author,
        keywords: unique(`${tag},${options.site_keywords}`.split(',')).join(',')
      },
      // token: req.csrfToken(),
      ...commonData,
      posts,
      comments,
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, total),
        linkUrl: '/tag/' + tag + '/page-',
        linkParam: ''
      }
    };
    const titles = [tag, '标签', options.site_name];
    if (page > 1) {
      titles.unshift(`第${page}页`);
    }
    resData.meta.title = this.utilService.getTitle(titles);

    return resData;
  }

  @Get([
    'archive/:year',
    'archive/:year/page-:page',
    'archive/:year/:month',
    'archive/:year/:month/page-:page'
  ])
  @Render('home/pages/post-list')
  async showPostsByDate(
    @Req() req: Request,
    @Param('page', new ParseIntPipe(1)) page: number,
    @Param('year', new ParseIntPipe()) year,
    @Param('month', new ParseIntPipe()) month,
    @IsAdmin() isAdmin: boolean
  ) {
    year = year.toString();
    month = month ? month < 10 ? '0' + month : month.toString() : '';

    const commonData = await this.commonService.getCommonData({
      from: 'archive',
      isAdmin
    });
    const postList = await this.postsService.getPosts({
      page,
      postType: PostType.POST,
      isAdmin,
      year,
      month
    });
    const { posts, total, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const { options } = commonData;
    const siteDesc = this.utilService.getSiteDescription(options);
    const crumbs: CrumbEntity[] = [{
      'label': '文章归档',
      'tooltip': '文章归档',
      'url': '/archive',
      'headerFlag': false
    }, {
      'label': `${year}年`,
      'tooltip': `${year}年`,
      'url': '/archive/' + year,
      'headerFlag': !month
    }];
    if (month) {
      crumbs.push({
        'label': `${parseInt(month, 10)}月`,
        'tooltip': `${year}年${month}月`,
        'url': `/archive/${year}/${month}`,
        'headerFlag': true
      });
    }
    const title = `${year}年${month ? month + '月' : ''}`;
    const resData = {
      curNav: 'archive',
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: '',
        description: `${options.site_name}${title}文章` + (page > 1 ? `(第${page}页)` : '') + '。' + siteDesc,
        author: options.site_author,
        keywords: options.site_keywords
      },
      // token: req.csrfToken(),
      ...commonData,
      posts,
      comments,
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, total),
        linkUrl: `/archive/${year}${month ? '/' + month : ''}/page-`,
        linkParam: ''
      }
    };
    const titles = [title, '文章归档', options.site_name];
    if (page > 1) {
      titles.unshift(`第${page}页`);
    }
    resData.meta.title = this.utilService.getTitle(titles);

    return resData;
  }

  @Get('archive')
  @Render('home/pages/archive-list')
  async showArchiveList(@Req() req: Request, @IsAdmin() isAdmin: boolean) {
    const commonData = await this.commonService.getCommonData({
      from: 'archive',
      isAdmin,
      archiveLimit: 0
    });
    const crumbs: CrumbEntity[] = [{
      'label': '文章归档',
      'tooltip': '文章归档',
      'url': '/archive',
      'headerFlag': false
    }, {
      'label': '归档历史',
      'tooltip': '归档历史',
      'url': '',
      'headerFlag': true
    }];
    const { options, archiveDates } = commonData;
    const { archiveDateYears, archiveDateList } = this.postsService.transformArchiveDates(archiveDates);
    const siteDesc = this.utilService.getSiteDescription(options);

    return {
      curNav: 'archive-list',
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: this.utilService.getTitle(['文章归档', options.site_name]),
        description: `${options.site_name}文章归档，查看${options.site_name}全部历史文章。` + siteDesc,
        author: options.site_author,
        keywords: options.site_keywords
      },
      // token: req.csrfToken(),
      ...commonData,
      archiveDateList,
      archiveDateYears
    };
  }
}
