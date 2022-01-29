import { Controller, Get, HttpStatus, Param, Query, Render, Req, Session, UseInterceptors } from '@nestjs/common';
import { ResponseCode, ResponseMessage } from '../common/enums';
import { POST_DESCRIPTION_LENGTH } from '../common/constants';
import Ip from '../decorators/ip.decorator';
import IpAndAgent from '../decorators/ip-and-agent.decorator';
import IsAdmin from '../decorators/is-admin.decorator';
import Referer from '../decorators/referer.decorator';
import User from '../decorators/user.decorator';
import UserAgent from '../decorators/user-agent.decorator';
import CustomException from '../exceptions/custom.exception';
import { appendUrlRef, cutStr, filterHtmlTag, uniqueTags } from '../helpers/helper';
import CheckPostIdInterceptor from '../interceptors/check-post-id.interceptor';
import ParseIntPipe from '../pipes/parse-int.pipe';
import CommentsService from '../services/comments.service';
import CommonService from '../services/common.service';
import CrumbService from '../services/crumb.service';
import LoggerService from '../services/logger.service';
import PaginatorService from '../services/paginator.service';
import PostsService from '../services/posts.service';
import TaxonomiesService from '../services/taxonomies.service';
import UtilService from '../services/util.service';
import { CrumbData } from '../interfaces/crumb.interface';

@Controller()
export default class PostController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commonService: CommonService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly loggerService: LoggerService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService,
    private readonly commentsService: CommentsService,
    private readonly crumbService: CrumbService
  ) {
  }

  @Get(['', 'post/page-:page'])
  @Render('home/pages/post-list')
  async showPosts(
    @Req() req,
    @Param('page', new ParseIntPipe(1)) page,
    @Query() query,
    @Session() session,
    @Ip() ip,
    @UserAgent() agent,
    @IpAndAgent() accessInfo,
    @IsAdmin() isAdmin
  ) {
    const commonData = await this.commonService.getCommonData({
      from: 'list',
      page,
      isAdmin
    });
    const postList = await this.postsService.getPosts({
      page,
      postType: 'post',
      isAdmin,
      keyword: query.keyword
    });
    const { posts, count, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const { options } = commonData;
    const siteDesc = this.utilService.getSiteDescription(options);
    const resData = {
      curNav: 'index',
      showCrumb: false,
      meta: {
        title: '',
        author: options.site_author.value,
        keywords: options.site_keywords.value,
        description: (page > 1 ? `${options.site_name.value}文章列表(第${page}页)。` : '') + siteDesc
      },
      token: req.csrfToken(),
      ...commonData,
      posts,
      comments,
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, count),
        linkUrl: '/post/page-',
        linkParam: query.keyword ? '?keyword=' + query.keyword : ''
      }
    };
    const titles = [options.site_name.value];
    if (query.keyword) {
      titles.unshift('搜索结果');
      if (page > 1) {
        titles.unshift(`第${page}页`);
      }
      titles.unshift(query.keyword);
    } else {
      titles.unshift(options.site_slogan.value);
      if (page > 1) {
        titles.unshift(`第${page}页`);
      }
    }
    resData.meta.title = this.utilService.getTitle(titles);

    return resData;
  }

  @Get('post/:postId')
  @Render('home/pages/post')
  @UseInterceptors(CheckPostIdInterceptor)
  async showPost(
    @Req() req,
    @Param('postId') postId,
    @Referer(true) referer,
    @User() user,
    @IsAdmin() isAdmin
  ) {
    const post = await this.postsService.getPostById(postId, isAdmin);
    if (!post || !post.postId) {
      throw new CustomException({
        data: {
          code: ResponseCode.POST_NOT_FOUND,
          status: HttpStatus.NOT_FOUND,
          message: `Post: ${postId} is not exist.`
        }
      });
    }
    // 无管理员权限不允许访问非公开文章(包括草稿)
    if (!isAdmin && post.postStatus !== 'publish') {
      throw new CustomException({
        data: {
          code: ResponseCode.UNAUTHORIZED,
          status: HttpStatus.NOT_FOUND,
          message: ResponseMessage.PAGE_NOT_FOUND
        },
        log: {
          msg: `[Unauthorized]${post.postId}:${post.postTitle} is ${post.postStatus}`
        }
      });
    }
    let taxonomies = [];
    post.taxonomies.forEach((v) => {
      if (v.type === 'post') {
        taxonomies.push(v);
      }
    });
    if (taxonomies.length < 1) {
      throw new CustomException({
        data: {
          code: ResponseCode.TAXONOMY_NOT_FOUND,
          status: HttpStatus.NOT_FOUND,
          message: ResponseMessage.PAGE_NOT_FOUND
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
    taxonomies = taxonomies.filter((item) => item.status === 1 || isAdmin);
    let crumbTaxonomyId;
    if (taxonomies.length > 0) {
      // todo: parent category
      const crumbTaxonomies = taxonomies.filter((item) => referer.endsWith(`/${item.slug}`));
      if (crumbTaxonomies.length > 0) {
        crumbTaxonomyId = crumbTaxonomies[0].taxonomyId;
      }
      crumbTaxonomyId = crumbTaxonomyId || taxonomies[0].taxonomyId;
    }
    if (!isAdmin && !crumbTaxonomyId) {
      throw new CustomException({
        data: {
          code: ResponseCode.TAXONOMY_INVISIBLE,
          status: HttpStatus.NOT_FOUND,
          message: ResponseMessage.PAGE_NOT_FOUND
        },
        log: {
          msg: 'Taxonomy is invisible.',
          data: {
            postId: post.postId,
            postTitle: post.postTitle
          }
        }
      });
    }
    const commonData = await this.commonService.getCommonData({
      from: 'post',
      isAdmin
    });
    const crumbs = await this.taxonomiesService.getTaxonomyPath({
      taxonomyData: commonData.taxonomies.taxonomyData,
      taxonomyId: crumbTaxonomyId
    });
    const { comments, prevPost, nextPost } = await Promise.all([
      this.commentsService.getCommentsByPostId(postId),
      this.postsService.getPrevPost(postId),
      this.postsService.getNextPost(postId),
      this.postsService.incrementPostView(postId)
    ]).then((results) => {
      return Promise.resolve({
        comments: results[0],
        prevPost: results[1],
        nextPost: results[2]
      });
    });

    const postMeta: Record<string, string> = {};
    if (post.postMeta) {
      post.postMeta.forEach((meta) => {
        postMeta[meta.metaKey] = meta.metaValue;
      });
    }
    postMeta.copyright_type_text = this.postsService.transformCopyright(postMeta.copyright_type);
    postMeta.postAuthor = postMeta.post_author || post.author.userNiceName;

    const { options } = commonData;
    const resData = {
      curNav: crumbs[0].slug,
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: this.utilService.getTitle([post.postTitle, options.site_name.value]),
        author: options.site_author.value,
        keywords: options.site_keywords.value,
        description: post.postExcerpt || cutStr(filterHtmlTag(post.postContent), POST_DESCRIPTION_LENGTH)
      },
      token: req.csrfToken(),
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
      urlShare: appendUrlRef(options.site_url.value + post.postGuid, 'qrcode')
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
    keywords.push(options.site_keywords.value);
    resData.meta.keywords = uniqueTags(keywords.join(','));

    if (user) {
      resData.user.userName = user.userNiceName;
      resData.user.userEmail = user.userEmail;
    }
    return resData;
  }

  @Get(['category/:category', 'category/:category/page-:page'])
  @Render('home/pages/post-list')
  async showPostsByTaxonomy(
    @Req() req,
    @Param('page', new ParseIntPipe(1)) page,
    @Param('category') category,
    @IsAdmin() isAdmin
  ) {
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
    const postList = await this.postsService.getPosts({
      page,
      postType: 'post',
      isAdmin,
      subTaxonomyIds
    });
    const { posts, count, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const { options } = commonData;
    const curTaxonomyName = crumbs[crumbs.length - 1].title;
    const siteDesc = this.utilService.getSiteDescription(options);
    const resData = {
      curNav: crumbs[0].slug,
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: '',
        author: options.site_author.value,
        keywords: uniqueTags(curTaxonomyName + ',' + options.site_keywords.value),
        description: `「${curTaxonomyName}」相关文章` + (page > 1 ? `(第${page}页)` : '') + '。' + siteDesc
      },
      token: req.csrfToken(),
      ...commonData,
      posts,
      comments,
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, count),
        linkUrl: '/category/' + category + '/page-',
        linkParam: ''
      }
    };
    const titles = [curTaxonomyName, '分类目录', options.site_name.value];
    if (page > 1) {
      titles.unshift(`第${page}页`);
    }
    resData.meta.title = this.utilService.getTitle(titles);

    return resData;
  }

  @Get(['tag/:tag', 'tag/:tag/page-:page'])
  @Render('home/pages/post-list')
  async showPostsByTag(
    @Req() req,
    @Param('page', new ParseIntPipe(1)) page,
    @Param('tag') tag,
    @IsAdmin() isAdmin
  ) {
    const commonData = await this.commonService.getCommonData({
      from: 'tag',
      isAdmin
    });
    const postList = await this.postsService.getPosts({
      page,
      postType: 'post',
      isAdmin,
      from: 'tag',
      tag
    });
    const { posts, count, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const { options } = commonData;
    const siteDesc = this.utilService.getSiteDescription(options);
    const crumbs: CrumbData[] = [{
      'title': '标签',
      'tooltip': '标签',
      'url': '',
      'headerFlag': false
    }, {
      'title': tag,
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
        author: options.site_author.value,
        keywords: uniqueTags(tag + ',' + options.site_keywords.value),
        description: `「${tag}」相关文章` + (page > 1 ? `(第${page}页)` : '') + '。' + siteDesc
      },
      token: req.csrfToken(),
      ...commonData,
      posts,
      comments,
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, count),
        linkUrl: '/tag/' + tag + '/page-',
        linkParam: ''
      }
    };
    const titles = [tag, '标签', options.site_name.value];
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
    'archive/:year/:month/page-:page'])
  @Render('home/pages/post-list')
  async showPostsByDate(
    @Req() req,
    @Param('page', new ParseIntPipe(1)) page,
    @Param('year', new ParseIntPipe(new Date().getFullYear())) year,
    @Param('month', new ParseIntPipe(new Date().getMonth() + 1)) month,
    @IsAdmin() isAdmin
  ) {
    year = year.toString();
    month = month ? month < 10 ? '0' + month : month.toString() : '';

    const commonData = await this.commonService.getCommonData({
      from: 'archive',
      isAdmin
    });
    const postList = await this.postsService.getPosts({
      page,
      postType: 'post',
      isAdmin,
      from: 'archive',
      year,
      month
    });
    const { posts, count, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const { options } = commonData;
    const siteDesc = this.utilService.getSiteDescription(options);
    const crumbs: CrumbData[] = [{
      'title': '文章归档',
      'tooltip': '文章归档',
      'url': '/archive',
      'headerFlag': false
    }, {
      'title': `${year}年`,
      'tooltip': `${year}年`,
      'url': '/archive/' + year,
      'headerFlag': !month
    }];
    if (month) {
      crumbs.push({
        'title': `${parseInt(month, 10)}月`,
        'tooltip': `${year}年${month}月`,
        'url': `/archive/${year}/${month}`,
        'headerFlag': true
      });
    }
    const title = `${year}年${month ? month + '月' : ''}`;
    const resData = {
      curNav: 'tag',
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: '',
        author: options.site_author.value,
        keywords: options.site_keywords.value,
        description: `${options.site_name.value}${title}文章` + (page > 1 ? `(第${page}页)` : '') + '。' + siteDesc
      },
      token: req.csrfToken(),
      ...commonData,
      posts,
      comments,
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, count),
        linkUrl: `/archive/${year}${month ? '/' + month : ''}/page-`,
        linkParam: ''
      }
    };
    const titles = [title, '文章归档', options.site_name.value];
    if (page > 1) {
      titles.unshift(`第${page}页`);
    }
    resData.meta.title = this.utilService.getTitle(titles);

    return resData;
  }

  @Get('archive')
  @Render('home/pages/archive-list')
  async showArchiveList(@Req() req, @IsAdmin() isAdmin) {
    const commonData = await this.commonService.getCommonData({
      from: 'archive',
      isAdmin,
      archiveLimit: 0
    });
    const crumbs: CrumbData[] = [{
      'title': '文章归档',
      'tooltip': '文章归档',
      'url': '/archive',
      'headerFlag': false
    }, {
      'title': '归档历史',
      'tooltip': '归档历史',
      'url': '',
      'headerFlag': true
    }];
    const { options, archiveDates } = commonData;
    const { archiveDateYears, archiveDateList } = this.postsService.transformArchiveDate(archiveDates);
    const siteDesc = this.utilService.getSiteDescription(options);

    return {
      curNav: 'archive-list',
      curPos: this.crumbService.generateCrumb(crumbs),
      showCrumb: true,
      meta: {
        title: this.utilService.getTitle(['文章归档', options.site_name.value]),
        author: options.site_author.value,
        keywords: options.site_keywords.value,
        description: `${options.site_name.value}文章归档，查看${options.site_name.value}全部历史文章。` + siteDesc
      },
      token: req.csrfToken(),
      ...commonData,
      archiveDateList,
      archiveDateYears
    };
  }
}
