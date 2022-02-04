import { IsNotEmpty } from 'class-validator';

export default class OptionDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsNotEmpty({ message: '站点标题不能为空' })
  siteName: string;

  @IsNotEmpty({ message: '站点描述不能为空' })
  siteDescription: string;

  @IsNotEmpty({ message: '口号不能为空' })
  siteSlogan: string;

  @IsNotEmpty({ message: '站点地址不能为空' })
  siteUrl: string;

  @IsNotEmpty({ message: '关键词不能为空' })
  siteKeywords: string;

  @IsNotEmpty({ message: '电子邮件地址不能为空' })
  adminEmail: string;

  @IsNotEmpty({ message: 'ICP备案号不能为空' })
  icpNum: string;

  @IsNotEmpty({ message: '版权信息不能为空' })
  copyNotice: string;

  @IsNotEmpty({ message: '上传路径不能为空' })
  uploadPath: string;
}
