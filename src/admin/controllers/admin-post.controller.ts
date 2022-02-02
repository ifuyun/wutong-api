import { Controller, Get, HttpStatus, Param, Query, Render } from '@nestjs/common';
import { PostStatus, PostStatusLang, PostType, ResponseCode } from '../../common/enums';
import IsAdmin from '../../decorators/is-admin.decorator';
import Search from '../../decorators/search.decorator';
import CustomException from '../../exceptions/custom.exception';
import ParseIntPipe from '../../pipes/parse-int.pipe';
import TrimPipe from '../../pipes/trim.pipe';
import CommentsService from '../../services/comments.service';
import OptionsService from '../../services/options.service';
import PaginatorService from '../../services/paginator.service';
import PostsService from '../../services/posts.service';
import TaxonomiesService from '../../services/taxonomies.service';
import UsersService from '../../services/users.service';
import UtilService from '../../services/util.service';

@Controller('admin/post')
export default class AdminPostController {
  constructor(
    private readonly postsService: PostsService,
    private readonly optionsService: OptionsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly commentsService: CommentsService,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService,
    private readonly usersService: UsersService
  ) {
  }

  @Get(['', 'page-:page'])
  @Render('admin/pages/post-list')
  async showPostsForEdit(
    @Param('page', new ParseIntPipe(1)) page,
    @Query('status', new TrimPipe()) status,
    @Query('author', new TrimPipe()) author,
    @Query('date', new TrimPipe()) date,
    @Query('keyword', new TrimPipe()) keyword,
    @Query('tag', new TrimPipe()) tag,
    @Query('type', new TrimPipe()) type,
    @Query('category', new TrimPipe()) category,
    @Search() search,
    @IsAdmin() isAdmin
  ) {
    type = type || PostType.POST;
    if (!Object.keys(PostType).map((key) => PostType[key]).includes(type)) {
      throw new CustomException(ResponseCode.POST_TYPE_INVALID, HttpStatus.FORBIDDEN, '查询参数有误');
    }
    const searchParams: string[] = [];
    if (category) {
      const taxonomy = await this.taxonomiesService.getTaxonomyBySlug(category);
      if (!taxonomy) {
        throw new CustomException(ResponseCode.TAXONOMY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Taxonomy not found.');
      }
      searchParams.push(taxonomy.name);
    }
    if (author) {
      const user = await this.usersService.getUserById(author);
      if (!user) {
        throw new CustomException(ResponseCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, 'User not found.');
      }
      searchParams.push(user.userNiceName);
    }

    const dateArr = date.split('/');
    const year = dateArr[0];
    let month: number | string = parseInt(dateArr[1], 10);
    month = month ? month < 10 ? '0' + month : month.toString() : '';
    date = month ? year + '/' + month : year;

    const queryParam = {
      page,
      isAdmin,
      postType: type,
      from: 'admin',
      keyword,
      tag,
      year,
      month,
      status,
      author,
      subTaxonomyIds: null
    };
    const options = await this.optionsService.getOptions();
    const archiveDates = await this.postsService.getArchiveDates({ postType: type, limit: 0 });

    const taxonomyData = await this.taxonomiesService.getTaxonomies();
    const taxonomies = this.taxonomiesService.getTaxonomyTree(taxonomyData);
    const { taxonomyList } = taxonomies;
    if (type === PostType.POST && category) {
      const { subTaxonomyIds } = await this.taxonomiesService.getSubTaxonomies({
        taxonomyData: taxonomies.taxonomyData,
        taxonomyTree: taxonomies.taxonomyTree,
        slug: category
      });
      queryParam.subTaxonomyIds = subTaxonomyIds;
    }

    const postList = await this.postsService.getPosts(queryParam);
    const { posts, count, postIds } = postList;
    page = postList.page;
    const comments = await this.commentsService.getCommentCountByPosts(postIds);
    const titles = [type === PostType.PAGE ? '页面列表' : '文章列表', '管理后台', options.site_name.value];

    keyword && searchParams.push(keyword);
    tag && searchParams.push(tag);
    year && searchParams.push(date);
    status && searchParams.push(PostStatusLang[this.utilService.getEnumKeyByValue(PostStatus, status)]);
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
        linkUrl: '/admin/post/page-',
        linkParam: search
      },
      curNav: type,
      postType: type,
      options,
      posts,
      comments,
      taxonomyList,
      archiveDates,
      postStatus: this.postsService.getAllPostStatus(),
      curTaxonomy: category,
      curStatus: status,
      curTag: tag,
      curDate: date,
      curKeyword: keyword
    };
  }
}
