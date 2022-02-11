import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Render, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import { CommentStatus, CommentStatusDesc, Role } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-codes.enum';
import { UtilService } from '../common/util.service';
import { IdParams } from '../../decorators/id-params.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { Search } from '../../decorators/search.decorator';
import { User } from '../../decorators/user.decorator';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { getEnumKeyByValue } from '../../helpers/helper';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { CommentsService } from './comments.service';
import { OptionsService } from '../option/options.service';
import { PaginatorService } from '../paginator/paginator.service';

@Controller('admin/comment')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminCommentController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly optionsService: OptionsService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService
  ) {
  }

  @Get(['', 'page-:page'])
  @Render('admin/pages/comment-list')
  async showComments(
    @Req() req,
    @Param('page', new ParseIntPipe(1)) page,
    @Query('status', new TrimPipe()) status,
    @Query('keyword', new TrimPipe()) keyword,
    @Search() search
  ) {
    const options = await this.optionsService.getOptions();
    const commentList = await this.commentsService.getComments({ page, status, keyword });
    const { comments, count } = commentList;
    page = commentList.page;

    const searchParams: string[] = [];
    keyword && searchParams.push(keyword);
    status && searchParams.push(CommentStatusDesc[getEnumKeyByValue(CommentStatus, status)]);

    const titles = ['评论列表', '管理后台', options.site_name.value];
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
        linkUrl: '/admin/comment/page-',
        linkParam: search
      },
      curNav: 'comment',
      token: req.csrfToken(),
      options,
      comments,
      commentStatus: this.commentsService.getAllCommentStatus(),
      curStatus: status,
      curKeyword: keyword
    };
  }

  @Get('detail')
  @Render('admin/pages/comment-form')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['id'] })
  async editOrReplyComment(
    @Req() req,
    @Query('id', new TrimPipe()) commentId,
    @Query('action', new TrimPipe()) action,
    @User() user,
    @Referer() referer,
    @Session() session
  ) {
    if (!commentId) {
      throw new CustomException(ResponseCode.BAD_REQUEST, HttpStatus.BAD_REQUEST, '请求参数错误。');
    }
    if (!['show', 'edit', 'reply'].includes(action)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.FORBIDDEN, '操作不允许。');
    }
    const options = await this.optionsService.getOptions();
    const comment = await this.commentsService.getCommentById(commentId);
    const title = action === 'edit' ? '编辑评论' : action === 'reply' ? '回复评论' : '查看评论';
    session.commentReferer = referer;
    return {
      meta: {
        title: this.utilService.getTitle([title, '管理后台', options.site_name.value]),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      curNav: 'comment',
      token: req.csrfToken(),
      options,
      comment,
      user,
      title,
      action
    };
  }

  @Post('audit')
  @Header('Content-Type', 'application/json')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInBody: ['commentId'] })
  async auditComment(
    @Body(new TrimPipe()) data,
    @Referer() referer
  ) {
    if (!Object.keys(CommentStatus).map((k) => CommentStatus[k]).includes(data.action)) {
      throw new CustomException(ResponseCode.FORBIDDEN, HttpStatus.FORBIDDEN, '操作不允许。');
    }
    const result = await this.commentsService.auditComment(data.commentId, data.action);
    if (result[0] < 1) {
      throw new CustomException(ResponseCode.INTERNAL_SERVER_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, '操作失败。');
    }
    return {
      status: HttpStatus.OK,
      code: ResponseCode.SUCCESS,
      data: {
        url: referer || '/admin/comment'
      }
    };
  }
}
