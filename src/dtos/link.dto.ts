import { IsNotEmpty } from 'class-validator';
import { IsId } from '../validators/is-id.validator';
import { IsNumber } from '../validators/is-number.validator';

export default class LinkDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsId({ message: '链接不存在' })
  linkId?: string;

  @IsId({ message: '分类不存在' })
  @IsNotEmpty({ message: '请选择分类' })
  linkTaxonomy?: string;

  @IsNotEmpty({ message: 'URL不能为空' })
  linkUrl: string;

  @IsNotEmpty({ message: '名称不能为空' })
  linkName: string;

  @IsNotEmpty({ message: '请选择打开方式' })
  linkTarget: string;

  @IsNotEmpty({ message: '描述不能为空' })
  linkDescription: string;

  @IsNotEmpty({ message: '请选择可见性' })
  linkVisible: string;

  @IsNumber({ message: '排序必须为数字' })
  @IsNotEmpty({ message: '排序不能为空' })
  linkOrder: number;

  linkOwner?: string;
  linkImage?: string;
  linkRss?: string;
  created?: Date;
  modified?: Date;
}
