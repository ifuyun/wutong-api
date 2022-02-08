import { Body, Controller, Header, HttpStatus, Post, Req, Session } from '@nestjs/common';
import * as xss from 'sanitizer';
import { CommentFlag } from '../common/common.enum';
import { ResponseCode } from '../common/response-codes.enum';
import Ip from '../decorators/ip.decorator';
import IsAdmin from '../decorators/is-admin.decorator';
import User from '../decorators/user.decorator';
import UserAgent from '../decorators/user-agent.decorator';
import { CommentDto } from '../dtos/comment.dto';
import CustomException from '../exceptions/custom.exception';
import TrimPipe from '../pipes/trim.pipe';
import CommentsService from '../services/comments.service';
import PostsService from '../services/posts.service';

@Controller()
export default class CommentController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly postsService: PostsService
  ) {
  }

  @Post(['comment/save', 'admin/comment/save'])
  @Header('Content-Type', 'application/json')
  async saveComment(
    @Req() req,
    @Body(new TrimPipe()) commentDto: CommentDto,
    @User() user,
    @IsAdmin() isAdmin,
    @Ip() ip,
    @UserAgent() agent,
    @Session() session
  ) {
    user = user || {};
    let commentData: CommentDto = {
      commentId: commentDto.commentId,
      parentId: commentDto.parentId,
      postId: commentDto.postId,
      commentContent: xss.sanitize(commentDto.commentContent),
      captchaCode: commentDto.captchaCode || ''
    };
    if (!commentData.commentId) {
      commentData = {
        ...commentData,
        commentAuthor: xss.sanitize(commentDto.commentAuthor) || user.userNiceName || '',
        commentAuthorEmail: xss.sanitize(commentDto.commentAuthorEmail) || user.userEmail || '',
        commentStatus: isAdmin ? 'normal' : 'pending',
        commentIp: ip,
        commentAgent: agent,
        userId: user.userId || ''
      };
    }
    // 不是管理员，或，不是在后台修改、回复评论时
    const shouldCheckCaptcha = !isAdmin || !commentData.commentId && !commentData.parentId;
    if (shouldCheckCaptcha && (!commentData.captchaCode || !session.captcha)) {
      throw new CustomException(ResponseCode.CAPTCHA_INPUT_ERROR, HttpStatus.OK, '请输入验证码');
    }
    if (shouldCheckCaptcha && (session.captcha.toLowerCase() !== commentData.captchaCode.toLowerCase())) {
      throw new CustomException(ResponseCode.CAPTCHA_INPUT_ERROR, HttpStatus.OK, '验证码输入有误，请重新输入');
    }
    const post = await this.postsService.getPostById(commentData.postId);
    if (post.commentFlag === CommentFlag.CLOSE && !isAdmin) {
      throw new CustomException(ResponseCode.POST_COMMENT_CLOSED, HttpStatus.OK, '该文章禁止评论');
    }

    const result = await this.commentsService.saveComment(commentData);
    if (result < 1) {
      throw new CustomException(ResponseCode.COMMENT_SAVE_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, '评论保存失败。');
    }

    const referer = session.commentReferer;
    delete session.commentReferer;
    const postUrl = post.postGuid || ('/post/' + post.postId);

    return {
      code: ResponseCode.SUCCESS,
      data: {
        commentFlag: post.commentFlag,
        url: isAdmin ? referer || postUrl : postUrl
      }
    };
  }
}
