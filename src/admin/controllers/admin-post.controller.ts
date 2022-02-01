import { Controller, Get, Param, Query, Render } from '@nestjs/common';
import { PostStatus } from '../../common/enums';
import IsAdmin from '../../decorators/is-admin.decorator';
import OptionsService from '../../services/options.service';
import ParseIntPipe from '../../pipes/parse-int.pipe';
import TrimPipe from '../../pipes/trim.pipe';
import CommentsService from '../../services/comments.service';
import PaginatorService from '../../services/paginator.service';
import PostsService from '../../services/posts.service';
import TaxonomiesService from '../../services/taxonomies.service';
import UtilService from '../../services/util.service';

@Controller('admin/post')
export default class AdminPostController {
  constructor(
    private readonly postsService: PostsService,
    private readonly optionsService: OptionsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly commentsService: CommentsService,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService
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
    @IsAdmin() isAdmin
  ) {
    type = type === 'page' ? 'page' : 'post';
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

    // todo: should check if category is exist
    const taxonomyData = await this.taxonomiesService.getTaxonomies();
    const taxonomies = this.taxonomiesService.getTaxonomyTree(taxonomyData);
    const { taxonomyList } = taxonomies;
    if (type === 'post' && category) {
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
    const titles = [type === 'page' ? '页面列表' : '文章列表', '管理后台', options.site_name.value];
    const searchParam = [];
    // todo: can use URL.search directly
    const urlParam = [`type=${type}`];
    if (keyword) {
      searchParam.push(keyword);
      urlParam.push('keyword=' + keyword);
    }
    if (tag) {
      searchParam.push(tag);
      urlParam.push('tag=' + tag);
    }
    if (year) {
      searchParam.push(date);
      urlParam.push('date=' + date);
    }
    if (status) {
      searchParam.push(PostStatus[status]);
      urlParam.push('status=' + status);
    }
    if (category) {
      // todo
      // searchParam.push(category);
      urlParam.push('category=' + category);
    }
    // todo
    // if (author) {
    //   searchParam.push(author);
    //   urlParam.push(author);
    // }
    if (searchParam.length > 0) {
      titles.unshift(searchParam.join(' | '));
    }
    if (page > 1) {
      titles.unshift(`第${page}页`);
    }

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      pageBar: {
        paginator: this.paginatorService.getPaginator(page, count),
        linkUrl: '/admin/post/page-',
        linkParam: urlParam.length > 0 ? '?' + urlParam.join('&') : ''
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
