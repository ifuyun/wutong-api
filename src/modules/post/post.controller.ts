import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { Request } from 'express';
import * as formidable from 'formidable';
import { File } from 'formidable';
import * as fs from 'fs';
import { difference } from 'lodash';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as path from 'path';
import * as xss from 'sanitizer';
import { BreadcrumbEntity } from '../../common/breadcrumb.interface';
import { CommentFlag, PostStatus, PostType, Role, TaxonomyStatus, TaxonomyType } from '../../common/common.enum';
import { POST_EXCERPT_LENGTH } from '../../common/constants';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IdParams } from '../../decorators/id-params.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { PostDto, PostFileDto, PostRemoveDto } from '../../dtos/post.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { ForbiddenException } from '../../exceptions/forbidden.exception';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { NotFoundException } from '../../exceptions/not-found.exception';
import { UnauthorizedException } from '../../exceptions/unauthorized.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { filterHtmlTag, format, getFileExt, generateId, truncateString } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { TaxonomyModel } from '../../models/taxonomy.model';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CommentService } from '../comment/comment.service';
import { OptionService } from '../option/option.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { WatermarkService } from '../util/watermark.service';
import { FileData, PostArchivesQueryParam, PostQueryParam } from './post.interface';
import { PostService } from './post.service';

@Controller('api/posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly taxonomyService: TaxonomyService,
    private readonly commentService: CommentService,
    private readonly optionService: OptionService,
    private readonly watermarkService: WatermarkService
  ) {
  }

  @Get()
  @Header('Content-Type', 'application/json')
  async getPosts(
    @Query('page', new ParseIntPipe(1)) page: number,
    @Query('pageSize', new ParseIntPipe(10)) pageSize: number,
    @Query('category', new TrimPipe()) category: string,
    @Query('tag', new TrimPipe()) tag: string,
    @Query('year', new TrimPipe()) year: string,
    @Query('month', new ParseIntPipe()) month: number,
    @Query('status', new TrimPipe()) status: PostStatus | PostStatus[],
    @Query('commentFlag', new TrimPipe()) commentFlag: CommentFlag | CommentFlag[],
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('original', new TrimPipe()) original: string | string[],
    @Query('orders', new TrimPipe()) orders: string | string[],
    @Query('type', new TrimPipe()) postType: PostType | 'all',
    @Query('fa', new TrimPipe()) fa: string,
    @IsAdmin() isAdmin: boolean
  ) {
    postType = postType || PostType.POST;
    if (!Object.keys(PostType).map((key) => PostType[key]).includes(postType) && postType !== 'all') {
      throw new BadRequestException(format(Message.PARAM_INVALID, 'type'));
    }
    if (!isAdmin && postType !== PostType.POST) {
      throw new UnauthorizedException();
    }
    const fromAdmin = isAdmin && fa === '1';
    const param: PostQueryParam = {
      page,
      pageSize,
      // todo: status, quote, note
      postType: postType === 'all' ? [PostType.POST, PostType.PAGE, PostType.ATTACHMENT] : [postType],
      tag,
      year,
      month: month ? month < 10 ? '0' + month : month.toString() : '',
      keyword,
      isAdmin,
      fromAdmin
    };
    if (fromAdmin) {
      if (status) {
        status = Array.isArray(status) ? status : [status];
        const allowedStatuses = Object.keys(PostStatus).map((key) => PostStatus[key]);
        status.forEach((v: PostStatus) => {
          if (!allowedStatuses.includes(v)) {
            throw new BadRequestException(format(Message.PARAM_INVALID, 'status'));
          }
        });
        param.status = status;
      }
      if (commentFlag) {
        commentFlag = typeof commentFlag === 'string' ? [commentFlag] : commentFlag;
        const allowedFlags = Object.keys(CommentFlag).map((key) => CommentFlag[key]);
        commentFlag.forEach((v: CommentFlag) => {
          if (!allowedFlags.includes(v)) {
            throw new BadRequestException(format(Message.PARAM_INVALID, 'commentFlag'));
          }
        });
        param.commentFlag = commentFlag;
        param.postType = difference(param.postType, [PostType.ATTACHMENT]);
      }
      if (original) {
        original = typeof original === 'string' ? [original] : original;
        original.forEach((v) => {
          if (!['0', '1'].includes(v)) {
            throw new BadRequestException(format(Message.PARAM_INVALID, 'original'));
          }
        });
        param.original = original;
      }
    }
    let crumbs: BreadcrumbEntity[] = [];
    if (category) {
      const { taxonomies } = await this.taxonomyService.getTaxonomies({
        status: isAdmin ? [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE] : TaxonomyStatus.PUBLISH,
        type: TaxonomyType.POST,
        pageSize: 0
      });
      const taxonomyTree = this.taxonomyService.generateTaxonomyTree(taxonomies);
      const subTaxonomyIds = await this.taxonomyService.getAllChildTaxonomies<string[]>({
        taxonomyTree,
        status: isAdmin ? [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE] : [TaxonomyStatus.PUBLISH],
        type: TaxonomyType.POST,
        slug: category
      });
      if (subTaxonomyIds.length < 1) {
        throw new NotFoundException();
      }
      param.subTaxonomyIds = subTaxonomyIds;
      crumbs = await this.taxonomyService.getTaxonomyPath({
        taxonomyData: taxonomies,
        slug: category
      });
    }
    if (fromAdmin && orders.length > 0) {
      /* 管理员，且，从后台访问，且，传递了排序参数 */
      if (typeof orders === 'string') {
        orders = [orders];
      }
      if (postType === 'all') {
        orders.push('postType,asc');
      }
      param.orders = getQueryOrders({
        postViewCount: 1,
        postLikes: 2,
        commentCount: 3,
        postDate: 4,
        postCreated: 5,
        postModified: 6,
        postType: 7
      }, orders);
    }

    const postList = await this.postService.getPosts(param);
    return getSuccessResponse({ postList, crumbs });
  }

  @Get('archives')
  @Header('Content-Type', 'application/json')
  async getArchives(
    @Query('postType', new TrimPipe()) postType: PostType | 'all',
    @Query('showCount', new ParseIntPipe(1)) showCount: number,
    @Query('limit', new ParseIntPipe(10)) limit: number,
    @Query('status', new TrimPipe()) status: PostStatus | PostStatus[],
    @Query('fa', new TrimPipe()) fa: string,
    @IsAdmin() isAdmin: boolean
  ) {
    postType = postType || PostType.POST;
    if (![PostType.POST, PostType.PAGE, PostType.ATTACHMENT, 'all'].includes(postType)) {
      throw new BadRequestException(format(Message.PARAM_INVALID, 'postType'));
    }
    const fromAdmin = isAdmin && fa === '1';
    if (!fromAdmin && postType !== PostType.POST) {
      throw new UnauthorizedException();
    }
    const params: PostArchivesQueryParam = {
      postType: postType === 'all' ? [PostType.POST, PostType.PAGE, PostType.ATTACHMENT] : [postType],
      showCount: !!showCount,
      limit,
      isAdmin,
      fromAdmin
    };
    if (status) {
      status = Array.isArray(status) ? status : [status];
      const allowedStatuses = Object.keys(PostStatus).map((key) => PostStatus[key]);
      status.forEach((v: PostStatus) => {
        if (!allowedStatuses.includes(v)) {
          throw new BadRequestException(format(Message.PARAM_INVALID, 'status'));
        }
      });
      params.status = status;
    }
    const dateList = await this.postService.getArchives(params);
    return getSuccessResponse(dateList);
  }

  @Get('hot')
  @Header('Content-Type', 'application/json')
  async getHotPosts() {
    const posts = await this.postService.getHotPosts();
    return getSuccessResponse(posts);
  }

  @Get('random')
  @Header('Content-Type', 'application/json')
  async getRandomPosts() {
    const posts = await this.postService.getRandomPosts();
    return getSuccessResponse(posts);
  }

  @Get('recent')
  @Header('Content-Type', 'application/json')
  async getRecentPosts() {
    const posts = await this.postService.getRecentPosts();
    return getSuccessResponse(posts);
  }

  @Get('prev-and-next')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['postId'] })
  async getPrevAndNext(@Query('postId', new TrimPipe()) postId: string) {
    const prevPost = await this.postService.getPrevPost(postId);
    const nextPost = await this.postService.getNextPost(postId);

    return getSuccessResponse({ prevPost, nextPost });
  }

  @Get('post')
  async getPostByParam(
    @Query('slug', new TrimPipe()) slug: string,
    @IsAdmin() isAdmin: boolean
  ) {
    const post = await this.postService.getPostByGuid(slug, isAdmin);
    if (!post) {
      throw new NotFoundException();
    }
    // 无管理员权限不允许访问非公开文章(包括草稿)
    // todo: encrypt post
    if (!isAdmin && post.postStatus !== PostStatus.PUBLISH) {
      // log: `[Unauthorized]${post.postId}:${post.postTitle} is ${post.postStatus}`
      throw new ForbiddenException();
    }
    await this.postService.increasePostView(post.postId);

    post.postExcerpt = post.postExcerpt || truncateString(filterHtmlTag(post.postContent), POST_EXCERPT_LENGTH);

    const postMeta: Record<string, string> = {};
    post.postMeta.forEach((meta) => {
      postMeta[meta.metaKey] = meta.metaValue;
    });
    postMeta.postAuthor = postMeta.post_author || post.author.userNiceName;

    return getSuccessResponse({
      post, meta: postMeta, tags: post.taxonomies, categories: [], crumbs: []
    });
  }

  @Get(':postId')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInParams: ['postId'] })
  async getPostById(
    @Param('postId') postId: string,
    @Query('ref', new TrimPipe()) referer: string,
    @Query('fa', new TrimPipe()) fa: string,
    @IsAdmin() isAdmin: boolean
  ) {
    const fromAdmin = isAdmin && fa === '1';
    const post = await this.postService.getPostById(postId, isAdmin);
    if (!post || !post.postId) {
      throw new NotFoundException();
    }
    // 无管理员权限不允许访问非公开文章(包括草稿)
    // todo: encrypt post
    if (!isAdmin && post.postStatus !== PostStatus.PUBLISH) {
      // log: `[Unauthorized]${post.postId}:${post.postTitle} is ${post.postStatus}`
      throw new ForbiddenException();
    }

    let crumbs: BreadcrumbEntity[] = [];
    if (post.postType === PostType.POST) {
      // post categories
      let taxonomies: TaxonomyModel[] = post.taxonomies.filter((item) => item.taxonomyType === TaxonomyType.POST);
      if (!fromAdmin) {
        if (taxonomies.length < 1) {
          throw new NotFoundException(Message.POST_TAXONOMY_MISSED, ResponseCode.POST_TAXONOMY_MISSED);
        }
        let crumbTaxonomyId;
        // todo: parent category
        const crumbTaxonomies = taxonomies.filter(
          (item) => referer.split('?')[0].endsWith(`/${item.taxonomySlug}`)
        );
        if (crumbTaxonomies.length > 0) {
          crumbTaxonomyId = crumbTaxonomies[0].taxonomyId;
        } else {
          crumbTaxonomyId = taxonomies[0].taxonomyId;
        }
        const { taxonomies: allTaxonomies } = await this.taxonomyService.getTaxonomies({
          status: isAdmin ? [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE] : TaxonomyStatus.PUBLISH,
          type: TaxonomyType.POST,
          pageSize: 0
        });
        crumbs = this.taxonomyService.getTaxonomyPath({
          taxonomyData: allTaxonomies,
          taxonomyId: crumbTaxonomyId
        });
      }
    }
    if (!fromAdmin) {
      await this.postService.increasePostView(postId);
      post.postExcerpt = post.postExcerpt || truncateString(filterHtmlTag(post.postContent), POST_EXCERPT_LENGTH);
      post.postViewCount += 1;
    }

    const postMeta: Record<string, string> = {};
    post.postMeta.forEach((meta) => {
      postMeta[meta.metaKey] = meta.metaValue;
    });
    postMeta.postAuthor = postMeta.post_author || post.author.userNiceName;

    const tags: TaxonomyModel[] = [];
    const categories: TaxonomyModel[] = [];
    post.taxonomies.forEach((v) => {
      if (v.taxonomyType === TaxonomyType.TAG) {
        tags.push(v);
      } else if (v.taxonomyType === TaxonomyType.POST) {
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
    @Body(new TrimPipe()) postDto: PostDto,
    @AuthUser() user
  ) {
    const newPostId = postDto.postId || generateId();
    const postData: PostDto = {
      postId: postDto.postId,
      postTitle: xss.sanitize(postDto.postTitle),
      postContent: postDto.postContent,
      postExcerpt: xss.sanitize(postDto.postExcerpt),
      postName: postDto.postName,
      postAuthor: user.userId,
      postStatus: postDto.postStatus,
      postPassword: postDto.postStatus === PostStatus.PASSWORD ? postDto.postPassword : '',
      postOriginal: postDto.postOriginal,
      commentFlag: postDto.commentFlag,
      postDate: postDto.postDate
    };
    if (!postDto.postId) {// 编辑时不允许修改postType
      postData.postType = postDto.postType;
    } else {
      const post = await this.postService.getPostById(postDto.postId, true);
      if (post.postStatus !== PostStatus.TRASH && postDto.postStatus === PostStatus.TRASH) {
        throw new BadRequestException(Message.POST_SAVE_DISALLOW_DELETE);
      }
    }
    if (postDto.postStatus === PostStatus.TRASH && (postDto.postTaxonomies.length > 0 || postDto.postTags.length > 0)) {
      const errType: string[] = [];
      postDto.postTaxonomies.length > 0 && errType.push('分类');
      postDto.postTags.length > 0 && errType.push('标签');
      throw new BadRequestException(format(Message.POST_STATUS_MUST_NOT_TRASH, errType.join('和')));
    }
    if (postDto.postTaxonomies.length < 1
      && ![PostStatus.DRAFT, PostStatus.TRASH].includes(postDto.postStatus)
      && postDto.postType === PostType.POST
    ) {
      throw new BadRequestException(Message.POST_CATEGORY_IS_NULL);
    }
    if (postDto.postType !== PostType.ATTACHMENT) {
      postData.postGuid = postDto.postName
        ? postDto.postType === PostType.PAGE ? '/' + postDto.postName : '/post/' + postDto.postName
        : `/post/${newPostId}`;
      const isPostGuidExist = await this.postService.checkPostsExistByGuid(postData.postGuid, postData.postId);
      if (isPostGuidExist) {
        throw new BadRequestException(Message.POST_GUID_IS_EXIST, ResponseCode.POST_GUID_CONFLICT);
      }
    }

    if (postDto.postId && postDto.updateModified === 1) {
      postData.postModified = new Date();
    }
    const metaValue: [string, string][] = [
      ['show_wechat_card', postDto.showWechatCard.toString()],
      ['copyright_type', postDto.copyrightType.toString()]
    ];
    if (postDto.postOriginal !== 1) { // 非原创
      metaValue.push(['post_source', postDto.postSource]);
      metaValue.push(['post_author', postDto.postAuthor]);
    }
    const metaData = metaValue.map((item) => ({
      metaId: generateId(),
      postId: newPostId,
      metaKey: item[0],
      metaValue: item[1]
    }));

    await this.postService.savePost({
      newPostId,
      postData,
      postMeta: metaData,
      postTaxonomies: postDto.postTaxonomies,
      postTags: postDto.postTags
    });

    return getSuccessResponse();
  }

  @Delete()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async deletePosts(
    @Body(new TrimPipe()) removeDto: PostRemoveDto
  ) {
    await this.postService.deletePosts(removeDto.postIds);
    await this.taxonomyService.updateAllCount([TaxonomyType.POST, TaxonomyType.TAG]);

    return getSuccessResponse();
  }

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async uploadFile(
    @Req() req: Request,
    @AuthUser() user
  ) {
    const now = moment();
    const curYear = now.format('YYYY');
    const curMonth = now.format('MM');
    const keys = [
      'upload_path', 'upload_max_file_limit', 'upload_max_file_size',
      'watermark_font_path', 'upload_url_prefix', 'site_name', 'site_domain'
    ];
    const options = await this.optionService.getOptionByKeys(keys);
    const nullKeys = keys.filter((key) => !options[key]);
    if (nullKeys.length > 0) {
      throw new InternalServerErrorException(
        format(Message.OPTION_VALUE_MISSED, nullKeys.join(',')), ResponseCode.OPTIONS_MISSED
      );
    }

    const maxFileLimit = Number(options['upload_max_file_limit']);
    const maxFileSize = Number(options['upload_max_file_size']);
    const uploadPath = path.join(options['upload_path'], curYear, curMonth);
    mkdirp.sync(uploadPath);

    const form = formidable({
      keepExtensions: true,
      allowEmptyFiles: false,
      multiples: true,
      uploadDir: uploadPath,
      maxFileSize: maxFileLimit * maxFileSize * 1024,
      maxFields: maxFileLimit * 2,
      maxFieldsSize: maxFileSize * 1024
    });
    const result = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          return reject(err);
        }
        const fileList: File[] = Array.isArray(files['files']) ? files['files'] : [files['files']];
        const resultList: FileData[] = [];
        fileList.forEach((file) => {
          const originalName = file.originalFilename;
          const fileExt = getFileExt(originalName);
          const id = generateId();
          const fileName = id + fileExt;
          const filePath = path.join(uploadPath, fileName);
          fs.renameSync(file.filepath, filePath);
          resultList.push({
            id,
            guid: `${options['upload_url_prefix']}/${curYear}/${curMonth}/${fileName}`,
            name: fileName,
            originalName,
            mimeType: file.mimetype,
            path: filePath
          });
        });
        resolve({
          files: resultList,
          fields
        });
      });
    });

    if (result['fields'].watermark !== '0') {
      try {
        /* only images should add watermark */
        const imgTypes = ['image/png', 'image/jpeg', 'image/tiff', 'image/gif'];
        const imgFiles = result['files'].filter((file: FileData) => imgTypes.includes(file.mimeType));
        for (const file of imgFiles) {
          await this.watermarkService.watermark(file.path, options);
        }
      } catch (e) {
        throw new InternalServerErrorException(<Message>e.message || Message.FILE_WATERMARK_ERROR);
      }
    }
    const fileGuids = result['files'].map((file: FileData) => file.guid);
    const isPostGuidExist = await this.postService.checkPostsExistByGuid(fileGuids);
    if (isPostGuidExist) {
      throw new InternalServerErrorException(Message.FILE_GUID_IS_EXIST, ResponseCode.UPLOAD_PATH_CONFLICT);
    }
    const fileData: PostFileDto[] = [];
    result['files'].forEach((file: FileData) => {
      const fileDesc = xss.sanitize(file.originalName);
      fileData.push({
        postTitle: fileDesc,
        postContent: fileDesc,
        postExcerpt: fileDesc,
        postAuthor: user.userId,
        postStatus: PostStatus.PUBLISH,
        postType: PostType.ATTACHMENT,
        postOriginal: parseInt(result['fields'].original, 10) ? 1 : 0,
        postId: file.id,
        postGuid: file.guid,
        postDate: new Date(),
        postMimeType: file.mimeType
      });
    });
    await this.postService.saveFiles(fileData);

    return getSuccessResponse();
  }
}
