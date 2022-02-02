import { Controller, Get, Param, Query, Render, Req } from '@nestjs/common';
import CommentsService from '../../services/comments.service';
import ParseIntPipe from '../../pipes/parse-int.pipe';
import TrimPipe from '../../pipes/trim.pipe';
import Search from '../../decorators/search.decorator';
import IsAdmin from '../../decorators/is-admin.decorator';
import OptionsService from '../../services/options.service';
import { CommentStatus, CommentStatusLang, PostStatus, PostStatusLang, PostType } from '../../common/enums';
import UtilService from '../../services/util.service';
import PaginatorService from '../../services/paginator.service';

@Controller('admin/comment')
export class AdminCommentController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly optionsService: OptionsService,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService,
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
    const commentList = await this.commentsService.getComments({page, status, keyword});
    const {comments, count} = commentList;
    page = commentList.page;

    const searchParams: string[] = [];
    keyword && searchParams.push(keyword);
    status && searchParams.push(CommentStatusLang[this.utilService.getEnumKeyByValue(CommentStatus, status)]);

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
      token: req.csrfToken(),
      curNav: 'comment',
      options,
      comments,
      commentStatus: this.commentsService.getAllCommentStatus(),
      curStatus: status,
      curKeyword: keyword
    };
  }
}
