import { Controller, Get, HttpStatus, Param, Query, Render, Req, Session, UseInterceptors } from '@nestjs/common';
import { CommentStatus, CommentStatusDesc, ResponseCode } from '../../common/enums';
import Search from '../../decorators/search.decorator';
import ParseIntPipe from '../../pipes/parse-int.pipe';
import TrimPipe from '../../pipes/trim.pipe';
import CommentsService from '../../services/comments.service';
import PaginatorService from '../../services/paginator.service';
import OptionsService from '../../services/options.service';
import UtilService from '../../services/util.service';
import CheckIdInterceptor from '../../interceptors/check-id.interceptor';
import { IdParams } from '../../decorators/id-params.decorator';
import CustomException from '../../exceptions/custom.exception';
import Referer from '../../decorators/referer.decorator';

@Controller('admin/comment')
export class AdminCommentController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly optionsService: OptionsService,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService
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
    status && searchParams.push(CommentStatusDesc[this.utilService.getEnumKeyByValue(CommentStatus, status)]);

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
  @IdParams([], ['id'])
  async editOrReplyComment(
    @Req() req,
    @Query('id', new TrimPipe()) commentId,
    @Query('action', new TrimPipe()) action,
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
      title,
      action
    };
  }
}