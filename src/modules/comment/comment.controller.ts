import { Body, Controller, Get, Header, HttpStatus, Post, Query, Req, Session, UseInterceptors } from '@nestjs/common';
import * as xss from 'sanitizer';
import { CommentFlag, CommentStatus } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { Ip } from '../../decorators/ip.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { User } from '../../decorators/user.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { CommentDto } from '../../dtos/comment.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { TrimPipe } from '../../pipes/trim.pipe';
import { CommentsService } from './comments.service';
import { PostsService } from '../post/posts.service';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { IdParams } from '../../decorators/id-params.decorator';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { HttpResponseEntity } from '../../interfaces/http-response';
import { CaptchaService } from '../captcha/captcha.service';

@Controller()
export class CommentController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly postsService: PostsService,
    private readonly captchaService: CaptchaService
  ) {
  }

  @Get('api/comments')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['postId'] })
  @Header('Content-Type', 'application/json')
  async getCommentsByPostId(@Query('postId', new TrimPipe()) postId: string): Promise<HttpResponseEntity> {
    if (!postId) {
      throw new BadRequestException();
    }
    const comments = await this.commentsService.getCommentsByPostId(postId);
    return getSuccessResponse(comments);
  }

  @Post(['comment/save', 'admin/comment/save', 'api/comments'])
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
        commentStatus: CommentStatus.PENDING,
        commentIp: ip,
        commentAgent: agent,
        userId: user.userId || ''
      };
    }
    // 不是管理员，或，不是在后台修改、回复评论时
    const shouldCheckCaptcha = !isAdmin || !commentData.commentId && !commentData.parentId;
    if (shouldCheckCaptcha && !commentData.captchaCode) {
      throw new CustomException('请输入验证码', HttpStatus.BAD_REQUEST, ResponseCode.CAPTCHA_INPUT_ERROR);
    }
    if (shouldCheckCaptcha && (session.captcha?.toLowerCase() !== commentData.captchaCode.toLowerCase())) {
      throw new CustomException('验证码输入有误，请重新输入', HttpStatus.BAD_REQUEST, ResponseCode.CAPTCHA_INPUT_ERROR);
    }
    const post = await this.postsService.getPostById(commentData.postId);
    if (post.commentFlag === CommentFlag.CLOSE && !isAdmin) {
      throw new CustomException('该文章禁止评论', HttpStatus.FORBIDDEN, ResponseCode.POST_COMMENT_CLOSED);
    }
    commentData.commentStatus = post.commentFlag === CommentFlag.OPEN || isAdmin ? CommentStatus.NORMAL : CommentStatus.PENDING;

    const result = await this.commentsService.saveComment(commentData);
    if (result < 1) {
      throw new CustomException('评论保存失败。', HttpStatus.INTERNAL_SERVER_ERROR, ResponseCode.COMMENT_SAVE_ERROR);
    }
    this.captchaService.removeCaptcha(req.session);

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
