import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
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
import { ArrayMaxSizePlus } from '../validators/array-max-size-plus.validator';
import { IsHost } from '../validators/is-host.validator';

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

export class MediaOptionsDto {
  @MaxLength(UPLOAD_URL_PREFIX_LENGTH, { message: '上传文件URL前缀长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '上传文件URL前缀不能为空' })
  uploadUrlPrefix: string;
}
