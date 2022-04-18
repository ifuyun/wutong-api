import { IntersectionType } from '@nestjs/mapped-types';
import { ArrayMaxSize, ArrayNotEmpty, IsNotEmpty, IsNotIn, Matches, MaxLength, ValidateIf } from 'class-validator';
import { CommentFlag, PostStatus, PostType } from '../common/common.enum';
import {
  POST_AUTHOR_LENGTH,
  POST_EXCERPT_LENGTH,
  POST_PASSWORD_LENGTH,
  POST_SLUG_PREFIX_BLACKLIST,
  POST_SOURCE_LENGTH,
  POST_TAG_LIMIT,
  POST_TAXONOMY_LIMIT,
  POST_TITLE_LENGTH
} from '../common/constants';
import { Message } from '../common/message.enum';
import { format } from '../helpers/helper';
import { ArrayMaxSizePlus } from '../validators/array-max-size-plus.validator';
import { IsPostExist } from '../validators/async/is-post-exist.validator';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';

export class BasicPostDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsIncludedIn(
    { ranges: [PostType.POST, PostType.PAGE, PostType.ATTACHMENT] },
    { message: '内容类型“$constraint1”不支持' }
  )
  @IsNotEmpty({ message: '内容类型不能为空' })
  postType?: string;

  @IsPostExist({ message: '修改的内容不存在' })
  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  postId?: string;

  @MaxLength(POST_TITLE_LENGTH, { message: '标题最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '标题不能为空' })
  postTitle: string;

  @IsNotEmpty({ message: '内容不能为空' })
  postContent: string;

  @IsNotEmpty({ message: '发布时间不能为空' })
  postDate: Date;

  @MaxLength(POST_EXCERPT_LENGTH, { message: '文章摘要最大长度为$constraint1个字符' })
  postExcerpt?: string;

  @IsIncludedIn(
    { ranges: [PostStatus.PUBLISH, PostStatus.PASSWORD, PostStatus.PRIVATE, PostStatus.DRAFT, PostStatus.TRASH] },
    { message: '可见性“$constraint1”不支持' }
  )
  @IsNotEmpty({ message: '可见性不能为空' })
  postStatus: PostStatus;

  @ValidateIf(o => o.postType === PostType.PAGE || !!o.postName)
  @Matches(
    /^[a-zA-Z0-9]+(?:[~@$%&*\-_=+;:,]+[a-zA-Z0-9]+)*$/i,
    { message: '别名格式有误' }
  )
  @IsNotIn(POST_SLUG_PREFIX_BLACKLIST, { message: `别名不能为以下关键词：${POST_SLUG_PREFIX_BLACKLIST.join(',')}` })
  @IsNotEmpty({ message: '别名不能为空' })
  postName?: string;

  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  postParent?: string;

  @ArrayMaxSizePlus(
    { size: POST_TAG_LIMIT },
    { message: '标签数应不大于$constraint1个，实际为$constraint2个' }
  )
  postTags?: string[];

  postMimeType?: string;
}

export class AdditionalPostDto {
  postGuid?: string;
  postCreated?: Date;
  postModified?: Date;
  postViewCount?: number;
  commentCount?: number;

  @IsIncludedIn({ ranges: [0, 1, 2] }, { message: '请选择是否插入名片' })
  @IsNotEmpty({ message: '请选择是否插入名片' })
  showWechatCard?: 0 | 1 | 2;

  @IsIncludedIn({ ranges: [0, 1, 2] }, { message: '请选择版权类型' })
  @IsNotEmpty({ message: '请选择版权类型' })
  copyrightType?: 0 | 1 | 2;
}

export class PostDto extends IntersectionType(BasicPostDto, AdditionalPostDto) {
  @ValidateIf(o => o.postType === PostType.POST)
  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  @ArrayMaxSize(POST_TAXONOMY_LIMIT, { message: '分类数应不大于$constraint1个' })
  postTaxonomies?: string[];

  @IsIncludedIn({ ranges: [0, 1] }, { message: '请选择是否原创' })
  @IsNotEmpty({ message: '请选择是否原创' })
  postOriginal?: 0 | 1;

  @ValidateIf(o => o.postOriginal === 0)
  @MaxLength(POST_SOURCE_LENGTH, { message: '文章来源最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '转载文章请注明来源' })
  postSource?: string;

  @ValidateIf(o => o.postOriginal === 0)
  @MaxLength(POST_AUTHOR_LENGTH, { message: '文章作者最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '转载文章请注明作者' })
  postAuthor: string;

  @ValidateIf(o => o.postStatus === 'password')
  @MaxLength(POST_PASSWORD_LENGTH, { message: '密码最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '加密内容密码不能为空' })
  postPassword?: string;

  @IsIncludedIn(
    { ranges: [CommentFlag.OPEN, CommentFlag.VERIFY, CommentFlag.CLOSE] },
    { message: '评论状态“$constraint1”不支持' }
  )
  @IsNotEmpty({ message: '请选择评论状态' })
  commentFlag?: CommentFlag;

  @IsIncludedIn({ ranges: [0, 1] }, { message: '请选择是否更新文章修改时间' })
  @IsNotEmpty({ message: '请选择是否更新文章修改时间' })
  updateModified?: 0 | 1;
}

export class PostFileDto extends BasicPostDto {
  @IsIncludedIn({ ranges: [0, 1] }, { message: '请选择是否原创' })
  @IsNotEmpty({ message: '请选择是否原创' })
  postOriginal: 0 | 1;

  @ValidateIf(o => o.postOriginal === 0)
  @MaxLength(POST_SOURCE_LENGTH, { message: '文件来源最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '外部文件请注明来源' })
  postSource?: string;

  @ValidateIf(o => o.postOriginal === 0)
  @MaxLength(POST_AUTHOR_LENGTH, { message: '文件作者最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '外部文件请注明作者' })
  postAuthor: string;

  postGuid?: string;
}

export class PostRemoveDto {
  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  @ArrayNotEmpty({ message: Message.POST_DELETE_EMPTY })
  postIds: string[];
}
