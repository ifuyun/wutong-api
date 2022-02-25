import { Controller, Get, HttpException, HttpStatus, Render, Req } from '@nestjs/common';
import * as unique from 'lodash/uniq';
import { CommentsService } from '../comment/comments.service';
import { UtilService } from '../util/util.service';
import { LoggerService } from '../logger/logger.service';
import { PostsService } from '../post/posts.service';
import { PostCommonService } from '../post/post-common.service';
import { POST_DESCRIPTION_LENGTH } from '../../common/constants';
import { Message } from '../../common/message.enum';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { ReqPath } from '../../decorators/req-path.decorator';
import { User } from '../../decorators/user.decorator';
import { appendUrlRef, cutStr, filterHtmlTag } from '../../helpers/helper';

@Controller()
export class PostStandaloneController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commonService: PostCommonService,
    private readonly logger: LoggerService,
    private readonly utilService: UtilService,
    private readonly commentsService: CommentsService
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  @Get('*')
  @Render('home/pages/post-standalone')
  async showPostBySlug(
    @Req() req,
    @ReqPath() reqPath,
    @User() user,
    @IsAdmin() isAdmin
  ) {
    // todo: move to validation
    const isLikePost = this.utilService.isUrlPathLikePostSlug(reqPath);
    if (!isLikePost) {
      throw new HttpException(Message.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const post = await this.postsService.getPostBySlug(reqPath);
    if (!post) {
      throw new HttpException(Message.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND);
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
        title: this.utilService.getTitle([post.postTitle, options.site_name]),
        description: post.postExcerpt || cutStr(filterHtmlTag(post.postContent), POST_DESCRIPTION_LENGTH),
        author: options.site_author,
        keywords: unique(`${post.postTitle},${options.site_keywords}`.split(',')).join(',')
      },
      // token: req.csrfToken(),
      ...commonData,
      user: {
        userName: '',
        userEmail: ''
      },
      post,
      postMeta,
      comments,
      urlShare: appendUrlRef(options.site_url, post.postGuid, 'qrcode')
    };
    if (user) {
      resData.user.userName = user.userNiceName;
      resData.user.userEmail = user.userEmail;
    }

    return resData;
  }
}
