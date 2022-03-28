import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { uniq } from 'lodash';
import * as xss from 'sanitizer';
import { CommentFlag, PostStatus, PostType, Role, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IdParams } from '../../decorators/id-params.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { PostDto } from '../../dtos/post.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { CustomException } from '../../exceptions/custom.exception';
import { NotFoundException } from '../../exceptions/not-found.exception';
import { UnauthorizedException } from '../../exceptions/unauthorized.exception';
import { UnknownException } from '../../exceptions/unknown.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { getUuid } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { CrumbEntity } from '../../interfaces/crumb.interface';
import { PostArchiveDatesQueryParam, PostQueryParam } from '../../interfaces/posts.interface';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CommentService } from '../comment/comment.service';
import { LoggerService } from '../logger/logger.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { UtilService } from '../util/util.service';
import { PostsService } from './posts.service';

@Controller('api/posts')
export class PostController {
  constructor(
    private readonly postsService: PostsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly commentService: CommentService,
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
    @Query('status', new TrimPipe()) status: PostStatus | PostStatus[],
    @Query('commentFlag', new TrimPipe()) commentFlag: CommentFlag | CommentFlag[],
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('orders', new TrimPipe()) orders: string[],
    @Query('type', new TrimPipe()) postType: PostType,
    @Query('fa', new TrimPipe()) fa: string,
    @IsAdmin() isAdmin: boolean
  ) {
    postType = postType || PostType.POST;
    if (!Object.keys(PostType).map((key) => PostType[key]).includes(postType)) {
      throw new BadRequestException(Message.ILLEGAL_PARAM);
    }
    if (!isAdmin && postType !== PostType.POST) {
      throw new UnauthorizedException();
    }
    const fromAdmin = isAdmin && fa === '1';
    const param: PostQueryParam = {
      page,
      pageSize,
      postType,
      tag,
      year,
      month: month ? month < 10 ? '0' + month : month.toString() : '',
      keyword,
      isAdmin,
      fromAdmin
    };
    if (fromAdmin) {
      if (status) {
        status = typeof status === 'string' ? [status] : status;
        const allowedStatuses = Object.keys(PostStatus).map((key) => PostStatus[key]);
        status.forEach((v: PostStatus) => {
          if (!allowedStatuses.includes(v)) {
            throw new BadRequestException(Message.ILLEGAL_PARAM);
          }
        });
        param.status = status;
      }
      if (commentFlag) {
        commentFlag = typeof commentFlag === 'string' ? [commentFlag] : commentFlag;
        const allowedFlags = Object.keys(CommentFlag).map((key) => CommentFlag[key]);
        commentFlag.forEach((v: CommentFlag) => {
          if (!allowedFlags.includes(v)) {
            throw new BadRequestException(Message.ILLEGAL_PARAM);
          }
        });
        param.commentFlag = commentFlag;
      }
    }
    let crumbs: CrumbEntity[] = [];
    if (category) {
      const taxonomies = await this.taxonomiesService.getTaxonomyTreeData(isAdmin ? [0, 1] : 1);
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
    if (fromAdmin && orders.length > 0) {
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
    return getSuccessResponse({ postList, crumbs });
  }

  @Get('archive-dates')
  @Header('Content-Type', 'application/json')
  async getArchiveDates(
    @Query('postType', new TrimPipe()) postType: PostType,
    @Query('showCount', new ParseIntPipe(1)) showCount: number,
    @Query('limit', new ParseIntPipe(10)) limit: number,
    @Query('status', new TrimPipe()) status: PostStatus | PostStatus[],
    @Query('fa', new TrimPipe()) fa: string,
    @IsAdmin() isAdmin: boolean
  ) {
    if (postType && ![PostType.POST, PostType.PAGE, PostType.ATTACHMENT].includes(postType)) {
      throw new BadRequestException(Message.ILLEGAL_PARAM);
    }
    postType = postType || PostType.POST;
    const fromAdmin = isAdmin && fa === '1';
    const params: PostArchiveDatesQueryParam = {
      postType,
      showCount: !!showCount,
      limit,
      isAdmin,
      fromAdmin
    };
    if (status) {
      status = typeof status === 'string' ? [status] : status;
      const allowedStatuses = Object.keys(PostStatus).map((key) => PostStatus[key]);
      status.forEach((v: PostStatus) => {
        if (!allowedStatuses.includes(v)) {
          throw new BadRequestException(Message.ILLEGAL_PARAM);
        }
      });
      params.status = status;
    }
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
    @Query('ref', new TrimPipe()) referer: string,
    @Query('fa', new TrimPipe()) fa: string,
    @IsAdmin() isAdmin: boolean
  ) {
    const fromAdmin = isAdmin && fa === '1';
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

    // post categories
    let taxonomies: TaxonomyModel[] = post.taxonomies.filter((item) => item.type === TaxonomyType.POST);
    if (taxonomies.length < 1) {
      throw new NotFoundException({
        data: {
          code: ResponseCode.TAXONOMY_NOT_FOUND,
          message: Message.NOT_FOUND
        },
        log: {
          msg: Message.TAXONOMY_NOT_FOUND,
          data: {
            postId: post.postId,
            postTitle: post.postTitle
          }
        }
      });
    }
    await this.postsService.incrementPostView(postId);

    let crumbs: CrumbEntity[] = [];
    if (!fromAdmin) {
      let crumbTaxonomyId;
      // todo: parent category
      const crumbTaxonomies = taxonomies.filter((item) => referer.split('?')[0].endsWith(`/${item.slug}`));
      if (crumbTaxonomies.length > 0) {
        crumbTaxonomyId = crumbTaxonomies[0].taxonomyId;
      } else {
        crumbTaxonomyId = taxonomies[0].taxonomyId;
      }
      const allTaxonomies = await this.taxonomiesService.getTaxonomyTreeData(
        isAdmin ? [TaxonomyStatus.CLOSED, TaxonomyStatus.OPEN] : TaxonomyStatus.OPEN);
      crumbs = this.taxonomiesService.getTaxonomyPath({
        taxonomyData: allTaxonomies,
        taxonomyId: crumbTaxonomyId
      });
    }

    const postMeta: Record<string, string> = {};
    post.postMeta.forEach((meta) => {
      postMeta[meta.metaKey] = meta.metaValue;
    });
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

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async savePost(
    @Req() req: Request,
    @Body(new TrimPipe()) postDto: PostDto,
    @AuthUser() user,
    @Session() session: any
  ) {
    const newPostId = postDto.postId || getUuid();
    const postData: PostDto = {
      postId: postDto.postId,
      postTitle: xss.sanitize(postDto.postTitle),
      postContent: postDto.postContent,
      postExcerpt: xss.sanitize(postDto.postExcerpt),
      postGuid: postDto.postGuid || `/post/${newPostId}`,
      postAuthor: user.userId,
      postStatus: postDto.postStatus,
      postPassword: postDto.postStatus === PostStatus.PASSWORD ? postDto.postPassword : '',
      postOriginal: postDto.postOriginal,
      commentFlag: postDto.commentFlag,
      postDate: postDto.postDate
    };
    if (!postDto.postId) {// 编辑时不允许修改postType
      postData.postType = postDto.postType;
    }
    const isPostGuidExist = await this.postsService.checkPostGuidExist(postData.postGuid, postData.postId);
    if (isPostGuidExist) {
      throw new BadRequestException(Message.POST_GUID_EXIST, ResponseCode.POST_GUID_CONFLICT);
    }

    if (postDto.postId && postDto.updateModified === 1) {
      postData.postModified = new Date();
    }
    let postTags: string[];
    if (typeof postDto.postTags === 'string') {
      postTags = uniq(postDto.postTags.split(/[,\s]/i).filter((v) => v.trim()));
    } else {
      postTags = postDto.postTags;
    }
    const postTaxonomies = postDto.postTaxonomies;
    const metaValue: [string, string][] = [
      ['show_wechat_card', postDto.showWechatCard.toString()],
      ['copyright_type', postDto.copyrightType.toString()]
    ];
    if (postDto.postOriginal !== 1) { // 非原创
      metaValue.push(['post_source', postDto.postSource]);
      metaValue.push(['post_author', postDto.postAuthor]);
    }
    const metaData = metaValue.map((item) => ({
      metaId: getUuid(),
      postId: newPostId,
      metaKey: item[0],
      metaValue: item[1]
    }));

    const result = await this.postsService.savePost({
      newPostId,
      postData,
      postMeta: metaData,
      postTaxonomies,
      postTags
    });
    if (!result) {
      throw new UnknownException(Message.POST_SAVE_ERROR, ResponseCode.POST_SAVE_ERROR);
    }

    return getSuccessResponse();
  }
}
