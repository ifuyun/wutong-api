import { IntersectionType } from '@nestjs/mapped-types';
import { IsNotEmpty, MaxLength } from 'class-validator';
import { LinkTarget, LinkVisible } from '../common/common.enum';
import { LINK_DESCRIPTION_LENGTH, LINK_NAME_LENGTH, LINK_URL_LENGTH } from '../common/constants';
import { getEnumValues } from '../helpers/helper';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';
import { IsNumber } from '../validators/is-number.validator';

export class BasicLinkDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsId({ message: '参数非法' })
  linkId?: string;

  @MaxLength(LINK_NAME_LENGTH, { message: '名称长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '名称不能为空' })
  linkName: string;

  @MaxLength(LINK_URL_LENGTH, { message: 'URL长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: 'URL不能为空' })
  linkUrl: string;

  @MaxLength(LINK_DESCRIPTION_LENGTH, { message: '描述长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '描述不能为空' })
  linkDescription: string;

  @IsIncludedIn(
    { ranges: getEnumValues(LinkVisible) },
    { message: '可见性选择错误' }
  )
  @IsNotEmpty({ message: '请选择可见性' })
  linkVisible: string;

  @IsIncludedIn(
    { ranges: getEnumValues(LinkTarget) },
    { message: '打开方式选择错误' }
  )
  @IsNotEmpty({ message: '请选择打开方式' })
  linkTarget: string;

  @IsNumber({ message: '排序必须为数字' })
  @IsNotEmpty({ message: '排序不能为空' })
  linkOrder: number;

  @IsId({ message: '参数非法' })
  @IsNotEmpty({ message: '请选择分类' })
  linkTaxonomy?: string;
}

export class AdditionalLinkDto {
  linkOwner?: string;
  linkImage?: string;
  linkRss?: string;
  created?: Date;
  modified?: Date;
}

export class LinkDto extends IntersectionType(BasicLinkDto, AdditionalLinkDto) {
}
