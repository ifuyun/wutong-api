import { IntersectionType } from '@nestjs/mapped-types';
import { ArrayMaxSize, ArrayNotEmpty, IsNotEmpty, MaxLength, ValidateIf } from 'class-validator';
import { CommentFlag, PostStatus, PostType } from '../common/common.enum';
import {
  POST_AUTHOR_LENGTH,
  POST_EXCERPT_LENGTH,
  POST_SOURCE_LENGTH,
  POST_TAG_LIMIT,
  POST_TAXONOMY_LIMIT,
  POST_TITLE_LENGTH
} from '../common/constants';
import { Message } from '../common/message.enum';
import { getEnumValues } from '../helpers/helper';
import { ArrayMaxSizePlus } from '../validators/array-max-size-plus.validator';
import { IsPostExist } from '../validators/async/is-post-exist.validator';
import { IsGuid } from '../validators/is-guid.validator';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';
import { IsNumber } from '../validators/is-number.validator';

export class BasicPostDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsIncludedIn(
    { ranges: [PostType.POST, PostType.PAGE] },
    { message: '不支持的操作' }
  )
  @IsNotEmpty({ message: '参数非法' })
  postType?: string;

  @IsPostExist({ message: '修改的文章不存在' })
  @IsId({ message: '参数非法' })
  postId?: string;

  @MaxLength(POST_TITLE_LENGTH, { message: '文章标题长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '文章标题不能为空' })
  postTitle: string;

  @IsNotEmpty({ message: '文章内容不能为空' })
  postContent: string;

  @IsNotEmpty({ message: '发布时间不能为空' })
  postDate: Date;

  @MaxLength(POST_EXCERPT_LENGTH, { message: '文章摘要长度应不大于$constraint1字符' })
  postExcerpt?: string;

  @IsIncludedIn(
    { ranges: [PostStatus.PUBLISH, PostStatus.PASSWORD, PostStatus.PRIVATE, PostStatus.DRAFT, PostStatus.TRASH] },
    { message: '可见性选择错误' }
  )
  @IsNotEmpty({ message: '可见性不能为空' })
  postStatus: PostStatus;

  @IsId({ message: '参数非法' })
  postParent?: string;

  @ArrayMaxSizePlus(
    { size: POST_TAG_LIMIT, separator: /[,\s]/i },
    { message: '标签数应不大于$constraint1个，实际为$constraint2个' }
  )
  postTags?: string | string[];
}

export class AdditionalPostDto {
  postName?: string;
  postCreated?: Date;
  postModified?: Date;
  postViewCount?: number;
  commentCount?: number;

  @IsNumber({ message: '请选择是否插入名片' })
  @IsNotEmpty({ message: '请选择是否插入名片' })
  showWechatCard?: 0 | 1 | 2;

  @IsNumber({ message: '请选择版权类型' })
  @IsNotEmpty({ message: '请选择版权类型' })
  copyrightType?: 0 | 1 | 2;
}

export class PostDto extends IntersectionType(BasicPostDto, AdditionalPostDto) {
  @ValidateIf(o => o.postType === PostType.POST)
  @IsId({ message: '参数非法' })
  @ArrayMaxSize(POST_TAXONOMY_LIMIT, { message: '分类数应不大于$constraint1个' })
  postTaxonomies?: string[];

  @IsNumber({ message: '请选择是否原创' })
  @IsNotEmpty({ message: '请选择是否原创' })
  postOriginal?: 0 | 1;

  @ValidateIf(o => o.postOriginal === 0)
  @MaxLength(POST_SOURCE_LENGTH, { message: '文章来源长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '转载文章请注明来源' })
  postSource?: string;

  @ValidateIf(o => o.postOriginal === 0)
  @MaxLength(POST_AUTHOR_LENGTH, { message: '文章作者长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '转载文章请注明作者' })
  postAuthor: string;

  @ValidateIf(o => o.postType === PostType.PAGE || !!o.postGuid)
  @IsGuid({ message: 'URL格式有误' })
  @IsNotEmpty({ message: 'URL不能为空' })
  postGuid?: string;

  @ValidateIf(o => o.postStatus === 'password')
  @IsNotEmpty({ message: '加密内容密码不能为空' })
  postPassword?: string;

  @IsIncludedIn(
    { ranges: getEnumValues(CommentFlag) },
    { message: '评论状态选择错误' }
  )
  @IsNotEmpty({ message: '请选择评论状态' })
  commentFlag?: string;

  @IsNumber({ message: '请选择是否更新文章修改时间' })
  @IsNotEmpty({ message: '请选择是否更新文章修改时间' })
  updateModified?: 0 | 1;
}

export class PostFileDto extends BasicPostDto {
  postAuthor: string;
  postOriginal: 0 | 1;
  postGuid?: string;
}

export class PostRemoveDto {
  @IsId({ message: '参数非法' })
  @ArrayNotEmpty({ message: Message.POST_DELETE_EMPTY })
  postIds: string[];
}
