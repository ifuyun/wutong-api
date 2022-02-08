import { IsNotEmpty } from 'class-validator';
import { IsId } from '../validators/is-id.validator';
import { IsNumber } from '../validators/is-number.validator';

export class TaxonomyDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsId({ message: '分类不存在' })
  taxonomyId?: string;

  @IsNotEmpty({ message: '名称不能为空' })
  name: string;

  @IsNotEmpty({ message: '别名不能为空' })
  slug: string;

  @IsNotEmpty({ message: '描述不能为空' })
  description: string;

  @IsId({ message: '父节点不存在' })
  parent?: string;

  /**
   * 因为Body参数默认是string，而transform无法对Body生效，
   * 且库自带的IsNumber对string直接返回false，因此重写判断
   */
  @IsNumber({ message: '排序必须为数字' })
  termOrder?: number;

  @IsNotEmpty({ message: '状态不能为空' })
  status: number;

  type?: string;
  termGroup?: string;
  count?: number;
  created?: Date;
  modified?: Date;
}
