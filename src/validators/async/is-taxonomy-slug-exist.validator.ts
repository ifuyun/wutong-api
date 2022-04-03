import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { TaxonomyType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { format } from '../../helpers/helper';
import { TaxonomiesService } from '../../modules/taxonomy/taxonomies.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsTaxonomySlugExistConstraint implements ValidatorConstraintInterface {
  private taxonomyType: string;

  constructor(private readonly taxonomiesService: TaxonomiesService) {
  }

  async validate(value: string, args?: ValidationArguments): Promise<boolean> {
    const [type, id] = args.constraints;
    if (!value) {
      // 允许为空
      return true;
    }
    this.taxonomyType = args.object[type];

    return !(await this.taxonomiesService.checkTaxonomySlugExist(value, args.object[type], args.object[id])).isExist;
  }

  defaultMessage(args?: ValidationArguments): string {
    return format(Message.TAXONOMY_SLUG_EXIST, this.taxonomyType === TaxonomyType.TAG ? '标签' : '别名', '$value');
  }
}

export function IsTaxonomySlugExist(param: { typeField: string, idField?: string }, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsTaxonomySlugExist',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [param.typeField, param.idField],
      options: validationOptions,
      validator: IsTaxonomySlugExistConstraint
    });
  };
}
