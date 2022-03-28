import { Controller, Get, HttpStatus, Query, Render, Req, Session, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { CommentFlag, PostOriginal, PostStatus, PostType, Role, TaxonomyType } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { IdParams } from '../../decorators/id-params.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { CheckIdInterceptor } from '../../interceptors/check-id.interceptor';
import { PostModel } from '../../models/post.model';
import { LowerCasePipe } from '../../pipes/lower-case.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { CommentService } from '../comment/comment.service';
import { OptionsService } from '../option/options.service';
import { PaginatorService } from '../paginator/paginator.service';
import { TaxonomiesService } from '../taxonomy/taxonomies.service';
import { UtilService } from '../util/util.service';
import { PostsService } from './posts.service';

@Controller('admin/post')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminPostController {
  constructor(
    private readonly postsService: PostsService,
    private readonly optionsService: OptionsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly commentService: CommentService,
    private readonly paginatorService: PaginatorService,
    private readonly utilService: UtilService
  ) {
  }

  @Get('detail')
  @Render('admin/pages/post-form')
  @UseInterceptors(CheckIdInterceptor)
  @IdParams({ idInQuery: ['postId'] })
  async editPost(
    @Req() req: Request,
    @Query('postId', new TrimPipe()) postId: string,
    @Query('action', new TrimPipe(), new LowerCasePipe()) action: string,
    @Query('type', new TrimPipe(), new LowerCasePipe()) postType: PostType,
    @IsAdmin() isAdmin: boolean,
    @Referer() referer: string,
    @Session() session: any
  ) {
    postType = postType || PostType.POST;
    if (!['create', 'edit'].includes(action)) {
      throw new CustomException('操作不允许。', HttpStatus.FORBIDDEN, ResponseCode.FORBIDDEN);
    }
    if (![PostType.POST, PostType.PAGE].includes(postType)) {
      throw new CustomException('操作不允许。', HttpStatus.FORBIDDEN, ResponseCode.FORBIDDEN);
    }
    let post: PostModel;
    const postTags: string[] = [];
    const postTaxonomies: string[] = [];
    const postMeta: Record<string, string> = {
      'show_wechat_card': '1',
      'copyright_type': '1',
      'post_source': '',
      'post_author': ''
    };
    if (action === 'edit' && postId) {
      post = await this.postsService.getPostById(postId, isAdmin);
      if (!post) {
        throw new CustomException('文章不存在', HttpStatus.NOT_FOUND, ResponseCode.POST_NOT_FOUND);
      }
      post.postMeta.forEach((meta) => {
        postMeta[meta.metaKey] = meta.metaValue;
      });
      // in edit mode, postType is not required
      postType = <PostType>post.postType;
      if (post.taxonomies) {
        post.taxonomies.forEach((t) => {
          if (t.type === TaxonomyType.TAG) {
            postTags.push(t.name);
          } else if (t.type === TaxonomyType.POST) {
            postTaxonomies.push(t.taxonomyId);
          }
        });
      }
    }
    const options = await this.optionsService.getOptions();
    const taxonomyData = await this.taxonomiesService.getTaxonomyTreeData([0, 1], TaxonomyType.POST);
    const taxonomyTree = this.taxonomiesService.generateTaxonomyTree(taxonomyData);
    const taxonomyList = this.taxonomiesService.flattenTaxonomyTree(taxonomyTree, []);
    taxonomyList.forEach((node) => {
      if (postTaxonomies.includes(node.taxonomyId)) {
        node.isChecked = true;
      }
    });

    const emptyPost = {
      postStatus: PostStatus.PUBLISH,
      postOriginal: PostOriginal.YES,
      commentFlag: CommentFlag.VERIFY
    };
    const title = `${action === 'create' ? '撰写新' : '编辑'}${postType === PostType.POST ? '文章' : '页面'}`;
    const titles = [title, '管理后台', options.site_name];
    if (post) {
      titles.unshift(post.postTitle);
    }
    session.postReferer = referer;

    return {
      meta: {
        title: this.utilService.getTitle(titles),
        description: `${options.site_name}管理后台`,
        author: options.site_author
      },
      // token: req.csrfToken(),
      curNav: postType,
      title,
      options,
      post: post || emptyPost,
      postMeta: postMeta,
      taxonomyList: taxonomyList,
      postCategories: postTaxonomies,
      postTags: postTags.join(',')
    };
  }
}
