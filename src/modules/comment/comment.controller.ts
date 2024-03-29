import {
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  Post,
  Query,
  Req,
  Session,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import * as xss from 'sanitizer';
import { CommentFlag, CommentStatus, Role } from '../../common/common.enum';
import { HttpResponseEntity } from '../../common/http-response.interface';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IdParams } from '../../decorators/id-params.decorator';
import { IP } from '../../decorators/ip.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { CommentDto } from '../../dtos/comment.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { CustomException } from '../../exceptions/custom.exception';
import { ForbiddenException } from '../../exceptions/forbidden.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { format, getMd5, generateId } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CaptchaService } from '../captcha/captcha.service';
import { IpService } from '../common/ip.service';
import { PostService } from '../post/post.service';
import { CommentAuditParam, CommentQueryParam } from './comment.interface';
import { CommentService } from './comment.service';

@Controller('api/comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly postService: PostService,
    private readonly captchaService: CaptchaService,
    private readonly configService: ConfigService,
    private readonly ipService: IpService
  ) {
  }

  @Get()
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
          throw new BadRequestException(format(Message.PARAM_INVALID, 'status'));
        }
      });
      param.status = status;
    }
    if (!fromAdmin && !postId) {
      throw new BadRequestException();
    }
    if (fromAdmin && orders.length > 0) {
      param.orders = getQueryOrders({
        commentLikes: 1,
        commentCreated: 2
      }, orders);
    }
    const comments = await this.commentService.getComments(param);
    return getSuccessResponse(comments);
  }

  @Post('audit')
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
    await this.postService.updateCommentCountByComments(data.commentIds);

    return getSuccessResponse();
  }

  @Throttle(20, 60)
  @Post()
  @Header('Content-Type', 'application/json')
  async saveComment(
    @Req() req: Request,
    @Body(new TrimPipe()) commentDto: CommentDto,
    @AuthUser() user,
    @IsAdmin() isAdmin: boolean,
    @IP() ip: string,
    @UserAgent() agent: string,
    @Session() session: any
  ) {
    user = user || {};
    const fromAdmin = isAdmin && commentDto.fa;
    let isNew = true;
    let commentData: CommentDto = {
      postId: commentDto.postId,
      commentId: commentDto.commentId,
      commentParent: commentDto.commentParent,
      commentContent: xss.sanitize(commentDto.commentContent),
      captchaCode: commentDto.captchaCode || ''
    };
    if (!commentDto.commentId) {
      const commentId = generateId();
      commentData = {
        ...commentData,
        commentId,
        commentTop: commentDto.commentTop || commentId,
        authorName: xss.sanitize(commentDto.authorName),
        authorEmail: commentDto.authorEmail,
        authorEmailHash: getMd5(commentDto.authorEmail.toLowerCase()),
        commentStatus: isAdmin ? CommentStatus.NORMAL : CommentStatus.PENDING,
        authorIp: ip,
        authorUserAgent: agent,
        userId: user.userId || ''
      };
    } else {
      isNew = false;
      if (isAdmin && commentDto.commentStatus) {
        commentData.commentStatus = commentDto.commentStatus;
      }
    }
    // 不是在后台修改、回复评论时
    const shouldCheckCaptcha = !fromAdmin;
    if (shouldCheckCaptcha && !commentData.captchaCode) {
      throw new CustomException('请输入验证码', HttpStatus.BAD_REQUEST, ResponseCode.CAPTCHA_INPUT_ERROR);
    }
    if (shouldCheckCaptcha && (session.captcha?.toLowerCase() !== commentData.captchaCode?.toLowerCase())) {
      throw new CustomException('验证码输入有误，请重新输入', HttpStatus.BAD_REQUEST, ResponseCode.CAPTCHA_INPUT_ERROR);
    }
    const post = await this.postService.getPostById(commentData.postId);
    if (post.commentFlag === CommentFlag.CLOSE && !isAdmin) {
      throw new CustomException('该文章禁止评论', HttpStatus.FORBIDDEN, ResponseCode.POST_COMMENT_CLOSED);
    }
    if (post.commentFlag === CommentFlag.OPEN && !commentDto.commentId) {
      commentData.commentStatus = CommentStatus.NORMAL;
    }

    const userLocation = this.configService.get('env.isProd') ? await this.ipService.queryLocation(ip) : null;
    await this.commentService.saveComment(commentData, isNew, userLocation);
    await this.commentService.sendNotice({
      commentId: commentData.commentId,
      parentId: commentData.commentParent,
      isNew,
      post,
      fromAdmin
    });

    this.captchaService.removeCaptcha(req.session);

    return getSuccessResponse({
      status: post.commentFlag === CommentFlag.OPEN || isAdmin ? 'success' : 'verify'
    });
  }

  @Get('recent')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async getRecentComments(
    @Query('limit', new ParseIntPipe(5)) limit: number
  ) {
    const comments = await this.commentService.getRecentComments(limit);

    return getSuccessResponse(comments);
  }
}
