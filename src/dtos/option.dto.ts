import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, Max, MaxLength, Min } from 'class-validator';
import { CommentFlag, PostFormat } from '../common/common.enum';
import {
  SITE_ADMIN_EMAIL_LENGTH,
  SITE_COPYRIGHT_LENGTH,
  SITE_DESCRIPTION_LENGTH,
  SITE_ICP_NUM_LENGTH,
  SITE_KEYWORDS_SIZE,
  SITE_SLOGAN_LENGTH,
  SITE_TITLE_LENGTH,
  SITE_URL_LENGTH,
  UPLOAD_URL_PREFIX_LENGTH
} from '../common/constants';
import { getEnumValues } from '../helpers/helper';
import { ArrayMaxSizePlus } from '../validators/array-max-size-plus.validator';
import { IsHost } from '../validators/is-host.validator';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';

export class GeneralOptionsDto {
  // 验证顺序根据注解声明顺序从下往上
  @MaxLength(SITE_TITLE_LENGTH, { message: '站点标题长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '站点标题不能为空' })
  siteTitle: string;

  @MaxLength(SITE_DESCRIPTION_LENGTH, { message: '站点描述长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '站点描述不能为空' })
  siteDescription: string;

  @MaxLength(SITE_SLOGAN_LENGTH, { message: '口号长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '口号不能为空' })
  siteSlogan: string;

  @IsHost({ message: '站点地址格式有误' })
  @MaxLength(SITE_URL_LENGTH, { message: '站点地址长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '站点地址不能为空' })
  siteUrl: string;

  @ArrayMaxSizePlus({ size: SITE_KEYWORDS_SIZE }, { message: '关键词数应不大于$constraint1个，实际为$constraint2个' })
  @IsNotEmpty({ message: '关键词不能为空' })
  siteKeywords: string[];

  @MaxLength(SITE_COPYRIGHT_LENGTH, { message: '版权信息长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '版权信息不能为空' })
  copyNotice: string;

  @MaxLength(SITE_ICP_NUM_LENGTH, { message: 'ICP备案号长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: 'ICP备案号不能为空' })
  icpNum: string;

  @IsEmail({ allow_display_name: false }, { message: '管理员邮箱输入不正确' })
  @MaxLength(SITE_ADMIN_EMAIL_LENGTH, { message: '管理员邮箱长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '管理员邮箱不能为空' })
  adminEmail: string;
}

export class WritingOptionsDto {
  @IsId({ message: '参数非法' })
  @IsNotEmpty({ message: '请选择默认文章分类' })
  defaultCategory: string;

  @IsIncludedIn(
    { ranges: getEnumValues(PostFormat) },
    { message: '文章形式不支持' }
  )
  @IsNotEmpty({ message: '请选择默认文章形式' })
  defaultPostFormat: string;
}

export class ReadingOptionsDto {
  @Min(1, { message: '博客每页显示篇数最小为$constraint1' })
  @Max(20, { message: '博客每页显示篇数最大为$constraint1' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 }, { message: '博客每页显示篇数必须为数字' })
  @IsNotEmpty({ message: '博客每页显示篇数不能为空' })
  postsPerPage: number;

  @Min(1, { message: 'Feed中显示项目数最小为$constraint1' })
  @Max(20, { message: 'Feed中显示项目数最大为$constraint1' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 }, { message: 'Feed中显示项目数必须为数字' })
  @IsNotEmpty({ message: 'Feed中显示项目数不能为空' })
  postsPerRss: number;

  @IsNotEmpty({ message: 'Feed中的每篇文章的显示方式不能为空' })
  rssUseExcerpt: 0 | 1;
}

export class DiscussionOptionsDto {
  @IsIncludedIn(
    { ranges: [CommentFlag.OPEN, CommentFlag.CLOSE] },
    { message: '默认评论状态选择错误' }
  )
  defaultCommentStatus: CommentFlag;

  @IsBoolean({ message: '请选择用户是否必须注册并登录才可以发表评论' })
  commentRegistration: boolean;

  @IsBoolean({ message: '请选择是否启用评论嵌套' })
  threadComments: boolean;

  @Min(2, { message: '评论嵌套层数最小为$constraint1' })
  @Max(10, { message: '评论嵌套层数最大为$constraint1' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 }, { message: '评论嵌套层数必须为数字' })
  @IsNotEmpty({ message: '评论嵌套层数不能为空' })
  threadCommentsDepth: number;

  @IsBoolean({ message: '请选择是否分页显示评论' })
  pageComments: boolean;

  @Min(1, { message: '每页显示评论数最小为$constraint1' })
  @Max(100, { message: '每页显示评论数最大为$constraint1' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 }, { message: '每页显示评论数必须为数字' })
  @IsNotEmpty({ message: '每页显示评论数不能为空' })
  commentsPerPage: number;

  @IsIncludedIn(
    { ranges: ['newest', 'oldest'] },
    { message: '评论显示顺序选择错误' }
  )
  @IsNotEmpty({ message: '评论显示顺序不能为空' })
  defaultCommentsPage: 'newest' | 'oldest';

  @IsIncludedIn(
    { ranges: ['asc', 'desc'] },
    { message: '评论排序选择错误' }
  )
  @IsNotEmpty({ message: '评论排序不能为空' })
  commentOrder: 'asc' | 'desc';

  @IsBoolean({ message: '请选择是否在有人发表评论时进行通知' })
  commentsNotify: boolean;

  @IsBoolean({ message: '请选择是否在有评论等待审核时进行通知' })
  moderationNotify: boolean;

  @IsBoolean({ message: '请选择评论是否必须经人工批准' })
  commentModeration: boolean;

  @IsBoolean({ message: '请选择是否评论者先前须有评论通过了审核' })
  commentPreviouslyApproved: boolean;

  @IsBoolean({ message: '请选择是否显示头像' })
  showAvatars: boolean;

  avatarDefault: string;
}

export class MediaOptionsDto {
  @MaxLength(UPLOAD_URL_PREFIX_LENGTH, { message: '上传文件URL前缀长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '上传文件URL前缀不能为空' })
  uploadUrlPrefix: string;
}
