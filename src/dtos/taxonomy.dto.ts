import { IntersectionType } from '@nestjs/mapped-types';
import { ArrayNotEmpty, IsInt, IsNotEmpty, MaxLength, ValidateIf } from 'class-validator';
import { TaxonomyStatus, TaxonomyType } from '../common/common.enum';
import { TAXONOMY_DESCRIPTION_LENGTH, TAXONOMY_NAME_LENGTH, TAXONOMY_SLUG_LENGTH } from '../common/constants';
import { Message } from '../common/message.enum';
import { format } from '../helpers/helper';
import { IsTaxonomyExist } from '../validators/async/is-taxonomy-exist.validator';
import { IsTaxonomySlugExist } from '../validators/async/is-taxonomy-slug-exist.validator';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';

export class BasicTaxonomyDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsIncludedIn(
    { ranges: [TaxonomyType.POST, TaxonomyType.TAG, TaxonomyType.LINK] },
    { message: format(Message.PARAM_INVALID, '$constraint1') }
  )
  @IsNotEmpty({ message: format(Message.PARAM_MISSED, 'taxonomyType') })
  taxonomyType?: TaxonomyType;

  @IsTaxonomyExist({ message: '修改的分类不存在' })
  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  taxonomyId?: string;

  @MaxLength(TAXONOMY_NAME_LENGTH, { message: '名称最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '名称不能为空' })
  taxonomyName: string;

  @IsTaxonomySlugExist({ typeField: 'taxonomyType', idField: 'taxonomyId' })
  @MaxLength(TAXONOMY_SLUG_LENGTH, { message: '别名最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '别名不能为空' })
  taxonomySlug: string;

  @MaxLength(TAXONOMY_DESCRIPTION_LENGTH, { message: '描述最大长度为$constraint1个字符' })
  @IsNotEmpty({ message: '描述不能为空' })
  taxonomyDescription: string;

  @IsTaxonomyExist({ message: '父节点不存在' })
  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  taxonomyParent?: string;

  @ValidateIf(o => o.taxonomyType !== TaxonomyType.TAG)
  @IsInt({ message: '排序必须为数字' })
  taxonomyOrder?: number;

  @IsIncludedIn(
    { ranges: [TaxonomyStatus.PUBLISH, TaxonomyStatus.PRIVATE, TaxonomyStatus.TRASH] },
    { message: '状态“$constraint1”不支持' }
  )
  @IsNotEmpty({ message: '状态不能为空' })
  taxonomyStatus: TaxonomyStatus;
}

export class AdditionalTaxonomyDto {
  objectCount?: number;
  taxonomyCreated?: Date;
  taxonomyModified?: Date;
}

export class TaxonomyDto extends IntersectionType(BasicTaxonomyDto, AdditionalTaxonomyDto) {
}

export class TaxonomyRemoveDto {
  @IsIncludedIn(
    { ranges: [TaxonomyType.POST, TaxonomyType.TAG, TaxonomyType.LINK] },
    { message: format(Message.PARAM_INVALID, '$constraint1') }
  )
  @IsNotEmpty({ message: format(Message.PARAM_MISSED, 'taxonomyType') })
  taxonomyType: TaxonomyType;

  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  @ArrayNotEmpty({ message: '请选择要删除的分类' })
  taxonomyIds: string[];
}
