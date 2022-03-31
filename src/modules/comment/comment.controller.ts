import { Body, Controller, Get, Header, HttpStatus, Post, Query, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import * as xss from 'sanitizer';
import { CommentFlag, CommentStatus, Role } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IdParams } from '../../decorators/id-params.decorator';
import { Ip } from '../../decorators/ip.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { CommentDto } from '../../dtos/comment.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { CustomException } from '../../exceptions/custom.exception';
import { ForbiddenException } from '../../exceptions/forbidden.exception';
import { UnknownException } from '../../exceptions/unknown.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { CommentAuditParam, CommentQueryParam } from '../../interfaces/comments.interface';
import { HttpResponseEntity } from '../../interfaces/http-response';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CaptchaService } from '../captcha/captcha.service';
import { PostsService } from '../post/posts.service';
import { CommentService } from './comment.service';

@Controller()
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
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
    @Query('status', new TrimPipe()) status: CommentStatus | CommentStatus[],
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('orders', new TrimPipe()) orders: string[],
    @Query('fa', new TrimPipe()) fa: string,
    @IsAdmin() isAdmin: boolean
  ): Promise<HttpResponseEntity> {
    const fromAdmin = isAdmin && fa === '1';
    const param: CommentQueryParam = {
      page,
      pageSize,
      postId,
      keyword,
      fromAdmin
    };
    if (status) {
      status = typeof status === 'string' ? [status] : status;
      const allowed = Object.keys(CommentStatus).map((key) => CommentStatus[key]);
      status.forEach((v: CommentStatus) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(Message.ILLEGAL_PARAM);
        }
      });
      param.status = status;
    }
    if (!fromAdmin && !postId) {
      throw new BadRequestException();
    }
    if (fromAdmin && orders.length > 0) {
      param.orders = getQueryOrders({
        commentVote: 1,
        created: 2
      }, orders);
    }
    const comments = await this.commentService.getComments(param);
    return getSuccessResponse(comments);
  }

  @Post('api/comments/audit')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInBody: ['commentId'] })
  @Header('Content-Type', 'application/json')
  async auditComment(
    @Body(new TrimPipe()) data: CommentAuditParam
  ) {
    if (!Object.keys(CommentStatus).map((k) => CommentStatus[k]).includes(data.action)) {
      throw new ForbiddenException();
    }
    await this.commentService.auditComment(data.commentIds, data.action);

    return getSuccessResponse();
  }

  @Post(['api/comments'])
  @Header('Content-Type', 'application/json')
  async saveComment(
    @Req() req: Request,
    @Body(new TrimPipe()) commentDto: CommentDto,
    @AuthUser() user,
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
    if (!commentDto.commentId) {
      commentData = {
        ...commentData,
        commentAuthor: xss.sanitize(commentDto.commentAuthor || '') || user.userNiceName || '',
        commentAuthorEmail: xss.sanitize(commentDto.commentAuthorEmail || '') || user.userEmail || '',
        commentStatus: isAdmin ? CommentStatus.NORMAL : CommentStatus.PENDING,
        commentIp: ip,
        commentAgent: agent,
        userId: user.userId || ''
      };
    } else {
      if (isAdmin && commentDto.commentStatus) {
        commentData.commentStatus = commentDto.commentStatus;
      }
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
    if (post.commentFlag === CommentFlag.OPEN && !commentDto.commentId) {
      commentData.commentStatus = CommentStatus.NORMAL;
    }

    await this.commentService.saveComment(commentData);
    this.captchaService.removeCaptcha(req.session);

    return getSuccessResponse({
      commentFlag: post.commentFlag
    });
  }
}
