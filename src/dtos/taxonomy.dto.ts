import { IntersectionType } from '@nestjs/mapped-types';
import { ArrayNotEmpty, IsNotEmpty, MaxLength, ValidateIf } from 'class-validator';
import { TaxonomyStatus, TaxonomyType } from '../common/common.enum';
import { TAXONOMY_DESCRIPTION_LENGTH, TAXONOMY_NAME_LENGTH, TAXONOMY_SLUG_LENGTH } from '../common/constants';
import { getEnumStringValues } from '../helpers/helper';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';
import { IsNumber } from '../validators/is-number.validator';
import { IsTaxonomyExist } from '../validators/async/is-taxonomy-exist.validator';
import { IsTaxonomySlugExist } from '../validators/async/is-taxonomy-slug-exist.validator';

export class BasicTaxonomyDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsIncludedIn(
    { ranges: getEnumStringValues(TaxonomyType) },
    { message: '不支持的操作' }
  )
  @IsNotEmpty({ message: '参数非法' })
  type?: string;

  @IsTaxonomyExist({ message: '修改的分类不存在' })
  @IsId({ message: '参数非法' })
  taxonomyId?: string;

  @MaxLength(TAXONOMY_NAME_LENGTH, { message: '名称长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '名称不能为空' })
  name: string;

  @IsTaxonomySlugExist({ typeField: 'type', idField: 'taxonomyId' })
  @MaxLength(TAXONOMY_SLUG_LENGTH, { message: '别名长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '别名不能为空' })
  slug: string;

  @MaxLength(TAXONOMY_DESCRIPTION_LENGTH, { message: '描述长度应不大于$constraint1字符' })
  @IsNotEmpty({ message: '描述不能为空' })
  description: string;

  @IsTaxonomyExist({ message: '父节点不存在' })
  @IsId({ message: '参数非法' })
  parentId?: string;

  @ValidateIf(o => o.type !== TaxonomyType.TAG)
  @IsNumber({ message: '排序必须为数字' })
  termOrder?: number;

  @IsIncludedIn(
    { ranges: getEnumStringValues(TaxonomyStatus) },
    { message: '状态选择错误' }
  )
  @IsNotEmpty({ message: '状态不能为空' })
  status: string;
}

export class AdditionalTaxonomyDto {
  termGroup?: string;
  count?: number;
  created?: Date;
  modified?: Date;
}

export class TaxonomyDto extends IntersectionType(BasicTaxonomyDto, AdditionalTaxonomyDto) {
}

export class RemoveTaxonomyDto {
  @IsId({ message: '参数非法' })
  @ArrayNotEmpty({ message: '请选择要删除的分类' })
  taxonomyIds: string[];
}
