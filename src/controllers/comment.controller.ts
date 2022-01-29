import { Body, Controller, Header, HttpStatus, Post, Req, Session, UsePipes, ValidationPipe } from '@nestjs/common';
import * as xss from 'sanitizer';
import CommentsService from '../services/comments.service';
import CommentDto from '../dtos/comment.dto';
import TrimPipe from '../pipes/trim.pipe';
import { ResponseCode } from '../common/enums';
import User from '../decorators/user.decorator';
import IsAdmin from '../decorators/is-admin.decorator';
import Ip from '../decorators/ip.decorator';
import UserAgent from '../decorators/user-agent.decorator';
import PostsService from '../services/posts.service';
import CustomException from '../exceptions/custom.exception';
import ExceptionFactory from '../validators/exception-factory';

@Controller('comment')
export default class CommentController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly postsService: PostsService
  ) {
  }

  @Post('save')
  @UsePipes(new ValidationPipe({
    transform: true,
    skipNullProperties: true,
    stopAtFirstError: true,
    exceptionFactory: ExceptionFactory
  }))
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
    commentDto = {
      ...commentDto,
      commentContent: xss.sanitize(commentDto.commentContent),
      parentId: commentDto.parentId,
      postId: commentDto.postId,
      commentAuthor: xss.sanitize(commentDto.commentAuthor) || user.userNiceName || '',
      commentAuthorEmail: xss.sanitize(commentDto.commentAuthorEmail) || user.userEmail || '',
      commentStatus: isAdmin ? 'normal' : 'pending',
      commentIp: ip,
      commentAgent: agent,
      userId: user.userId || '',
      captchaCode: commentDto.captchaCode || ''
    };
    // 不是管理员，或，不是在后台修改、回复评论时
    const shouldCheckCaptcha = !isAdmin || !commentDto.commentId && !commentDto.parentId;
    if (shouldCheckCaptcha && (!commentDto.captchaCode || !session.captcha)) {
      throw new CustomException(ResponseCode.CAPTCHA_INPUT_ERROR, HttpStatus.OK, '请输入验证码');
    }
    if (shouldCheckCaptcha && (session.captcha.toLowerCase() !== commentDto.captchaCode.toLowerCase())) {
      throw new CustomException(ResponseCode.CAPTCHA_INPUT_ERROR, HttpStatus.OK, '验证码输入有误，请重新输入');
    }

    const post = await this.postsService.getPostById(commentDto.postId, isAdmin);
    if (!post || !post.postId) {
      throw new CustomException(ResponseCode.POST_NOT_FOUND, HttpStatus.OK, '评论文章不存在');
    }
    if (post.commentFlag === 'closed' && !isAdmin) {
      throw new CustomException(ResponseCode.POST_COMMENT_CLOSED, HttpStatus.OK, '该文章禁止评论');
    }

    await this.commentsService.saveComment(commentDto);

    const referer = req.session.commentReferer;
    delete req.session.commentReferer;
    const postUrl = post.postGuid || ('/post/' + post.postId);

    return {
      status: HttpStatus.OK,
      code: ResponseCode.SUCCESS,
      data: {
        commentFlag: post.commentFlag,
        url: isAdmin ? referer || postUrl : postUrl
      }
    };
  }
}
