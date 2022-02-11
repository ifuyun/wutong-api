import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import * as unique from 'lodash/uniq';
import * as xss from 'sanitizer';
import { CommentsService } from '../comment/comments.service';
import { UtilService } from '../common/util.service';
import { OptionsService } from '../option/options.service';
import { PaginatorService } from '../paginator/paginator.service';
import { PostsService } from './posts.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { UsersService } from '../user/users.service';
import { CommentFlag, PostOriginal, PostStatus, PostStatusDesc, PostType, Role, TaxonomyType } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-codes.enum';
import { IdParams } from '../../decorators/id-params.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { Search } from '../../decorators/search.decorator';
import { User } from '../../decorators/user.decorator';
import { PostDto } from '../../dtos/post.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { getEnumKeyByValue, getUuid } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { PostModel } from '../../models/post.model';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';

@Controller('admin/post')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminPostController {
  constructor(
    private readonly postsService: PostsService,
    private readonly optionsService: OptionsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly commentsService: CommentsService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService,
    private readonly usersService: UsersService
  ) {
  }

  @Get(['', 'page-:page'])
  @Render('admin/pages/post-list')
  async showPostsForEdit(
    @Param('page', new ParseIntPipe(1)) page,
    @Query('status', new TrimPipe()) status,
    @Query('author', new TrimPipe()) author,
    @Query('date', new TrimPipe()) date,
    @Query('keyword', new TrimPipe()) keyword,
    @Query('tag', new TrimPipe()) tag,
    @Query('type', new TrimPipe()) postType,
    @Query('category', new TrimPipe()) category,
    @Search() search,
    @IsAdmin() isAdmin
  ) {
    postType = postType || PostType.POST;
    if (!Object.keys(PostType).map((key) => PostType[key]).includes(postType)) {
      throw new CustomException(ResponseCode.POST_TYPE_INVALID, HttpStatus.FORBIDDEN, '查询参数有误');
    }
    const searchParams: string[] = [];
    if (category) {
      const taxonomy = await this.taxonomiesService.getTaxonomyBySlug(category);
      if (!taxonomy) {
        throw new CustomException(ResponseCode.TAXONOMY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Taxonomy not found.');
      }
      searchParams.push(taxonomy.name);
    }
    if (author) {
      const user = await this.usersService.getUserById(author);
      if (!user) {
        throw new CustomException(ResponseCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, 'User not found.');
      }
      searchParams.push(user.userNiceName);
    }

    const dateArr = date.split('/');
    const year = dateArr[0];
    let month: number | string = parseInt(dateArr[1], 10);
    month = month ? month < 10 ? '0' + month : month.toString() : '';
    date = month ? year + '/' + month : year;

    const queryParam = {
      page,
      isAdmin,
      postType,
      from: 'admin',
      keyword,
      tag,
      year,
      month,
      status,
      author,
      subTaxonomyIds: null
    };
    const options = await this.optionsService.getOptions();
    const archiveDates = await this.postsService.getArchiveDates({ postType, limit: 0 });

    const taxonomyData = await this.taxonomiesService.getAllTaxonomies();
    const taxonomies = this.taxonomiesService.getTaxonomyTree(taxonomyData);
    const { taxonomyList } = taxonomies;
    if (postType === PostType.POST && category) {
      const { subTaxonomyIds } = await this.taxonomiesService.getSubTaxonomies({
        taxonomyData: taxonomies.taxonomyData,
        taxonomyTree: taxonomies.taxonomyTree,
        slug: category
      });
      queryParam.subTaxonomyIds = subTaxonomyIds;
    }

    const postList = await this.postsService.getPosts(queryParam);
    const { posts, count, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const titles = [postType === PostType.PAGE ? '页面列表' : '文章列表', '管理后台', options.site_name.value];

    keyword && searchParams.push(keyword);
    tag && searchParams.push(tag);
    year && searchParams.push(date);
    status && searchParams.push(PostStatusDesc[getEnumKeyByValue(PostStatus, status)]);
    searchParams.length > 0 && titles.unshift(searchParams.join(' | '));
    page > 1 && titles.unshift(`第${page}页`);

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, count),
        linkUrl: '/admin/post/page-',
        linkParam: search
      },
      curNav: postType,
      postType: postType,
      options,
      posts,
      comments,
      taxonomyList,
      archiveDates,
      postStatus: this.postsService.getAllPostStatus(),
      curTaxonomy: category,
      curStatus: status,
      curTag: tag,
      curDate: date,
      curKeyword: keyword
    };
  }

  @Get('detail')
  @Render('admin/pages/post-form')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['postId'] })
  async editPost(
    @Req() req,
    @Query('postId', new TrimPipe()) postId,
    @Query('action', new TrimPipe(), new LowerCasePipe()) action,
    @Query('type', new TrimPipe(), new LowerCasePipe()) postType,
    @IsAdmin() isAdmin,
    @Referer() referer,
    @Session() session
  ) {
    postType = postType || PostType.POST;
    if (!['create', 'edit'].includes(action)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.FORBIDDEN, '操作不允许。');
    }
    if (![PostType.POST, PostType.PAGE].includes(postType)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.FORBIDDEN, '操作不允许。');
    }
    let post: PostModel;
    const postTags: string[] = [];
    const postTaxonomies: string[] = [];
    if (action === 'edit' && postId) {
      post = await this.postsService.getPostById(postId, isAdmin);
      if (!post) {
        throw new CustomException(ResponseCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND, '文章不存在');
      }
      // in edit mode, postType is not required
      postType = post.postType;
      if (post.taxonomies) {
        post.taxonomies.forEach((t) => {
          if (t.type === TaxonomyType.TAG) {
            postTags.push(t.name);
          } else if (t.type === TaxonomyType.POST) {
            postTaxonomies.push(t.taxonomyId);
          }
        });
      }
    }
    const options = await this.optionsService.getOptions();
    const taxonomyData = await this.taxonomiesService.getAllTaxonomies([], TaxonomyType.POST);
    const taxonomies = this.taxonomiesService.getTaxonomyTree(taxonomyData);
    taxonomies.taxonomyList.forEach((node) => {
      if (postTaxonomies.includes(node.taxonomyId)) {
        node.isChecked = true;
      }
    });
    const postMeta: Record<string, string> = {
      'show_wechat_card': '1',
      'copyright_type': '1',
      'post_source': '',
      'post_author': ''
    };

    const emptyPost = {
      postStatus: PostStatus.PUBLISH,
      postOriginal: PostOriginal.YES,
      commentFlag: CommentFlag.VERIFY
    };
    const title = `${action === 'create' ? '撰写新' : '编辑'}${postType === PostType.POST ? '文章' : '页面'}`;
    const titles = [title, '管理后台', options.site_name.value];
    if (post) {
      titles.unshift(post.postTitle);
    }
    session.postReferer = referer;

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      token: req.csrfToken(),
      curNav: postType,
      title,
      options,
      post: post || emptyPost,
      postMeta: post && post.postMetaMap || postMeta,
      taxonomyList: taxonomies.taxonomyList,
      postCategories: postTaxonomies,
      postTags: postTags.join(',')
    };
  }

  @Post('save')
  @Header('Content-Type', 'application/json')
  async savePost(
    @Req() req,
    @Body(new TrimPipe()) postDto: PostDto,
    @User() user,
    @Session() session
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
      throw new CustomException(ResponseCode.POST_GUID_CONFLICT, HttpStatus.OK, 'URL已存在，请重新输入。');
    }

    const nowTime = new Date();
    // todo: updateModified is string
    if (postDto.postId && postDto.postContent !== postDto.postRawContent && postDto.updateModified.toString() === '1') {
      postData.postModified = nowTime;
    }
    let postTags: string[];
    if (typeof postDto.postTags === 'string') {
      postTags = unique(postDto.postTags.split(/[,\s]/i).filter((v) => v.trim()));
    } else {
      postTags = postDto.postTags;
    }
    const postTaxonomies = postDto.postTaxonomies;

    const metaData = [{
      metaId: getUuid(),
      postId: newPostId,
      metaKey: 'show_wechat_card',
      metaValue: postDto.showWechatCard || '0'
    }, {
      metaId: getUuid(),
      postId: newPostId,
      metaKey: 'copyright_type',
      metaValue: postDto.copyrightType || '1'
    }];
    // todo: postOriginal is string
    if (postDto.postOriginal.toString() !== '1') { // 非原创
      metaData.push({
        metaId: getUuid(),
        postId: newPostId,
        metaKey: 'post_source',
        metaValue: postDto.postSource
      });
      metaData.push({
        metaId: getUuid(),
        postId: newPostId,
        metaKey: 'post_author',
        metaValue: postDto.postAuthor
      });
    }

    const result = await this.postsService.savePost({
      newPostId,
      postData,
      postMeta: metaData,
      postTaxonomies,
      postTags
    });
    if (!result) {
      throw new CustomException(ResponseCode.POST_SAVE_ERROR, HttpStatus.OK, '保存失败。');
    }

    const referer = session.postReferer;
    delete session.postReferer;

    return {
      code: ResponseCode.SUCCESS,
      status: HttpStatus.OK,
      data: {
        url: referer || '/admin/post?type=' + postDto.postType
      }
    };
  }
}
