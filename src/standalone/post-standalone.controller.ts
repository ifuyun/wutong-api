import { Controller, Get, HttpException, HttpStatus, Param, Render, Req } from '@nestjs/common';
import { POST_DESCRIPTION_LENGTH } from '../common/constants';
import { ResponseMessage } from '../common/enums';
import IsAdmin from '../decorators/is-admin.decorator';
import User from '../decorators/user.decorator';
import { appendUrlRef, cutStr, filterHtmlTag, uniqueTags } from '../helpers/helper';
import CommentsService from '../services/comments.service';
import CommonService from '../services/common.service';
import LoggerService from '../services/logger.service';
import PaginatorService from '../services/paginator.service';
import PostsService from '../services/posts.service';
import TaxonomiesService from '../services/taxonomies.service';
import UtilService from '../services/util.service';
import ReqPath from '../decorators/req-path.decorator';

@Controller()
export default class PostStandaloneController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commonService: CommonService,
    private readonly loggerService: LoggerService,
    private readonly utilService: UtilService,
    private readonly commentsService: CommentsService
  ) {
  }

  @Get('*')
  @Render('home/pages/post-standalone')
  async showPostBySlug(
    @Req() req,
    @ReqPath() reqPath,
    @User() user,
    @IsAdmin() isAdmin
  ) {
    const isLikePost = this.utilService.isReqPathLikePostSlug(reqPath);
    if (!isLikePost) {
      throw new HttpException(ResponseMessage.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const post = await this.postsService.getPostBySlug(reqPath);
    if (!post) {
      throw new HttpException(ResponseMessage.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const { comments, commonData } = await Promise.all([
      this.commentsService.getCommentsByPostId(post.postId),
      this.commonService.getCommonData({
        from: 'page',
        isAdmin
      }),
      this.postsService.incrementPostView(post.postId)
    ]).then((results) => {
      return Promise.resolve({
        comments: results[0],
        commonData: results[1]
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
      curNav: '',
      showCrumb: false,
      meta: {
        title: this.utilService.getTitle([post.postTitle, options.site_name.value]),
        description: post.postExcerpt || cutStr(filterHtmlTag(post.postContent), POST_DESCRIPTION_LENGTH),
        author: options.site_author.value,
        keywords: uniqueTags(post.postTitle + ',' + options.site_keywords.value)
      },
      token: req.csrfToken(),
      ...commonData,
      user: {
        userName: '',
        userEmail: ''
      },
      post,
      postMeta,
      comments,
      urlShare: appendUrlRef(options.site_url.value + post.postGuid, 'qrcode')
    };
    if (user) {
      resData.user.userName = user.userNiceName;
      resData.user.userEmail = user.userEmail;
    }

    return resData;
  }
}
