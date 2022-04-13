import { ArrayNotEmpty, IsBoolean, IsEmail, IsInt, IsNotEmpty, Matches, Max, MaxLength, Min } from 'class-validator';
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
  STATIC_RESOURCE_HOST_LENGTH,
  UPLOAD_PATH_LENGTH,
  UPLOAD_URL_PREFIX_LENGTH,
  WATERMARK_FONT_PATH_LENGTH
} from '../common/constants';
import { Message } from '../common/message.enum';
import { format } from '../helpers/helper';
import { ArrayMaxSizePlus } from '../validators/array-max-size-plus.validator';
import { IsFilePath } from '../validators/is-file-path.validator';
import { IsHost } from '../validators/is-host.validator';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';

export class GeneralOptionsDto {
  // 验证顺序根据注解声明顺序从下往上
  @MaxLength(SITE_TITLE_LENGTH, { message: '站点标题最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '站点标题不能为空' })
  siteTitle: string;

  @MaxLength(SITE_DESCRIPTION_LENGTH, { message: '站点描述最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '站点描述不能为空' })
  siteDescription: string;

  @MaxLength(SITE_SLOGAN_LENGTH, { message: '口号最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '口号不能为空' })
  siteSlogan: string;

  @IsHost({ message: '站点地址格式有误' })
  @MaxLength(SITE_URL_LENGTH, { message: '站点地址最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '站点地址不能为空' })
  siteUrl: string;

  @ArrayMaxSizePlus({ size: SITE_KEYWORDS_SIZE }, { message: '关键词数应不大于$constraint1个，实际为$constraint2个' })
  @ArrayNotEmpty({ message: '关键词不能为空' })
  siteKeywords: string[];

  @MaxLength(SITE_COPYRIGHT_LENGTH, { message: '版权信息最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '版权信息不能为空' })
  copyNotice: string;

  @MaxLength(SITE_ICP_NUM_LENGTH, { message: 'ICP备案号最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: 'ICP备案号不能为空' })
  icpNum: string;

  @IsEmail({ allow_display_name: false }, { message: '管理员邮箱输入不正确' })
  @MaxLength(SITE_ADMIN_EMAIL_LENGTH, { message: '管理员邮箱最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '管理员邮箱不能为空' })
  adminEmail: string;
}

export class WritingOptionsDto {
  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  @IsNotEmpty({ message: '请选择默认文章分类' })
  defaultCategory: string;

  @IsIncludedIn(
    {
      ranges: [
        PostFormat.POST, PostFormat.STATUS, PostFormat.QUOTE, PostFormat.NOTE, PostFormat.IMAGE, PostFormat.VIDEO, PostFormat.AUDIO
      ]
    },
    { message: '文章形式“$constraint1”不支持' }
  )
  @IsNotEmpty({ message: '请选择默认文章形式' })
  defaultPostFormat: PostFormat;
}

export class ReadingOptionsDto {
  @Min(1, { message: '博客每页显示篇数最小为$constraint1' })
  @Max(20, { message: '博客每页显示篇数最大为$constraint1' })
  @IsInt({ message: '博客每页显示篇数必须为数字' })
  @IsNotEmpty({ message: '博客每页显示篇数不能为空' })
  postsPerPage: number;

  @Min(1, { message: 'Feed中显示项目数最小为$constraint1' })
  @Max(20, { message: 'Feed中显示项目数最大为$constraint1' })
  @IsInt({ message: 'Feed中显示项目数必须为数字' })
  @IsNotEmpty({ message: 'Feed中显示项目数不能为空' })
  postsPerRss: number;

  @IsIncludedIn({ ranges: [0, 1] }, { message: 'Feed中的每篇文章的显示方式选择有误' })
  @IsNotEmpty({ message: 'Feed中的每篇文章的显示方式不能为空' })
  rssUseExcerpt: 0 | 1;
}

export class DiscussionOptionsDto {
  @IsIncludedIn(
    { ranges: [CommentFlag.OPEN, CommentFlag.CLOSE] },
    { message: '默认评论状态“$constraint1”不支持' }
  )
  defaultCommentStatus: CommentFlag;

  @IsBoolean({ message: '请选择用户是否必须注册并登录才可以发表评论' })
  commentRegistration: boolean;

  @IsBoolean({ message: '请选择是否启用评论嵌套' })
  threadComments: boolean;

  @Min(2, { message: '评论嵌套层数最小为$constraint1' })
  @Max(10, { message: '评论嵌套层数最大为$constraint1' })
  @IsInt({ message: '评论嵌套层数必须为数字' })
  @IsNotEmpty({ message: '评论嵌套层数不能为空' })
  threadCommentsDepth: number;

  @IsBoolean({ message: '请选择是否分页显示评论' })
  pageComments: boolean;

  @Min(1, { message: '每页显示评论数最小为$constraint1' })
  @Max(100, { message: '每页显示评论数最大为$constraint1' })
  @IsInt({ message: '每页显示评论数必须为数字' })
  @IsNotEmpty({ message: '每页显示评论数不能为空' })
  commentsPerPage: number;

  @IsIncludedIn(
    { ranges: ['newest', 'oldest'] },
    { message: '评论显示顺序“$constraint1”不支持' }
  )
  @IsNotEmpty({ message: '评论显示顺序不能为空' })
  defaultCommentsPage: 'newest' | 'oldest';

  @IsIncludedIn(
    { ranges: ['asc', 'desc'] },
    { message: '评论排序“$constraint1”不支持' }
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
  @Min(1, { message: '单次上传文件数量限制最小为$constraint1' })
  @Max(20, { message: '单次上传文件数量限制最大为$constraint1' })
  @IsInt({ message: '单次上传文件数量限制必须为数字' })
  @IsNotEmpty({ message: '单次上传文件数量限制不能为空' })
  uploadFileLimit: number;

  @Min(100, { message: '单个上传文件大小限制最小为$constraint1 KB' })
  @Max(8192, { message: '单个上传文件大小限制最大为$constraint1 KB' })
  @IsInt({ message: '单个上传文件大小限制必须为数字' })
  @IsNotEmpty({ message: '单个上传文件大小限制不能为空' })
  uploadFileSize: number;

  @IsFilePath({ message: '文件上传路径格式有误' })
  @MaxLength(UPLOAD_PATH_LENGTH, { message: '文件上传路径最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '文件上传路径不能为空' })
  uploadPath: string;

  /* IsUrl can not match like http://localhost, so change to use RegExp */
  @Matches(
    /^https?:\/\/[a-zA-Z0-9]+(?:[\-_][a-zA-Z0-9]+)*(?:\.[a-zA-Z0-9]+(?:[\-_][a-zA-Z0-9]+)*)*(?::\d{1,5})?$/i,
    { message: '静态资源服务地址格式有误' }
  )
  @MaxLength(STATIC_RESOURCE_HOST_LENGTH, { message: '静态资源服务地址最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '静态资源服务地址不能为空' })
  staticResourceHost: string;

  @Matches(
    /^(?:\/[a-zA-Z0-9\-+_.,~%]+)+$/i,
    { message: '上传文件访问URL前缀格式有误' }
  )
  @MaxLength(UPLOAD_URL_PREFIX_LENGTH, { message: '上传文件访问URL前缀最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '上传文件访问URL前缀不能为空' })
  uploadUrlPrefix: string;

  @IsFilePath({ message: '水印字体文件路径格式有误' })
  @MaxLength(WATERMARK_FONT_PATH_LENGTH, { message: '水印字体文件路径最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '水印字体文件路径不能为空' })
  watermarkFontPath: string;
}
