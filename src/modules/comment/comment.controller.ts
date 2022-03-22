import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Req, Session, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import * as xss from 'sanitizer';
import { CommentFlag, CommentStatus } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { IdParams } from '../../decorators/id-params.decorator';
import { Ip } from '../../decorators/ip.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { User } from '../../decorators/user.decorator';
import { CommentDto } from '../../dtos/comment.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { CustomException } from '../../exceptions/custom.exception';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { CommentQueryParam } from '../../interfaces/comments.interface';
import { HttpResponseEntity } from '../../interfaces/http-response';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CaptchaService } from '../captcha/captcha.service';
import { PostsService } from '../post/posts.service';
import { CommentsService } from './comments.service';

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
  async getComments(
    @Query('page', new ParseIntPipe(1)) page: number,
    @Query('pageSize', new ParseIntPipe(10)) pageSize: number,
    @Query('postId', new TrimPipe()) postId: string,
    @Query('status', new TrimPipe()) status: CommentStatus,
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('orders', new TrimPipe()) orders: string[],
    @Query('from', new TrimPipe()) from: string,
    @IsAdmin() isAdmin: boolean
  ): Promise<HttpResponseEntity> {
    // todo: status is an array
    const param: CommentQueryParam = {
      page,
      pageSize,
      postId,
      status,
      keyword,
      isAdmin,
      from
    };
    if (from !== 'admin' && !postId) {
      throw new BadRequestException();
    }
    if (isAdmin && from === 'admin' && orders.length > 0) {
      param.orders = getQueryOrders({
        commentVote: 1,
        created: 2
      }, orders);
    }
    const comments = await this.commentsService.getComments(param);
    return getSuccessResponse(comments);
  }

  @Post(['comment/save', 'admin/comment/save', 'api/comments'])
  @Header('Content-Type', 'application/json')
  async saveComment(
    @Req() req: Request,
    @Body(new TrimPipe()) commentDto: CommentDto,
    @User() user,
    @IsAdmin() isAdmin: boolean,
    @Ip() ip: string,
    @UserAgent() agent: string,
    @Session() session: any
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
        commentAuthor: xss.sanitize(commentDto.commentAuthor || '') || user.userNiceName || '',
        commentAuthorEmail: xss.sanitize(commentDto.commentAuthorEmail || '') || user.userEmail || '',
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
    if (shouldCheckCaptcha && (session.captcha?.toLowerCase() !== commentData.captchaCode?.toLowerCase())) {
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
