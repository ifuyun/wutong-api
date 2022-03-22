import { Controller, Get, Header, HttpStatus, Param, Query, Req, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { PostStatus, PostType, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IdParams } from '../../decorators/id-params.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { CustomException } from '../../exceptions/custom.exception';
import { NotFoundException } from '../../exceptions/not-found.exception';
import { UnauthorizedException } from '../../exceptions/unauthorized.exception';
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
import { LoggerService } from '../logger/logger.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { UtilService } from '../util/util.service';
import { PostCommonService } from './post-common.service';
import { PostsService } from './posts.service';

@Controller('api/posts')
export class PostController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commonService: PostCommonService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly commentsService: CommentsService,
    private readonly logger: LoggerService,
    private readonly utilService: UtilService
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  @Get('')
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
    @Query('type', new TrimPipe()) postType: PostType,
    @Query('from', new TrimPipe()) from: string,
    @IsAdmin() isAdmin: boolean
  ) {
    postType = postType || PostType.POST;
    if (!Object.keys(PostType).map((key) => PostType[key]).includes(postType)) {
      throw new BadRequestException(Message.ILLEGAL_PARAM);
    }
    if (!isAdmin && postType !== PostType.POST) {
      throw new UnauthorizedException();
    }
    const param: PostQueryParam = {
      page,
      pageSize,
      postType,
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

  @Get('archive-dates')
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

  @Get('hot')
  @Header('Content-Type', 'application/json')
  async getHotPosts() {
    const posts = await this.postsService.getHotPosts();
    return getSuccessResponse(posts);
  }

  @Get('random')
  @Header('Content-Type', 'application/json')
  async getRandomPosts() {
    const posts = await this.postsService.getRandomPosts();
    return getSuccessResponse(posts);
  }

  @Get('recent')
  @Header('Content-Type', 'application/json')
  async getRecentPosts() {
    const posts = await this.postsService.getRecentPosts();
    return getSuccessResponse(posts);
  }

  @Get('prev-and-next')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['postId'] })
  async getPrevAndNext(@Query('postId', new TrimPipe()) postId: string) {
    const prevPost = await this.postsService.getPrevPost(postId);
    const nextPost = await this.postsService.getNextPost(postId);

    return getSuccessResponse({ prevPost, nextPost });
  }

  @Get('standalone')
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

  @Get(':postId')
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
}
