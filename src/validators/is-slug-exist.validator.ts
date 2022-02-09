import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import TaxonomiesService from '../services/taxonomies.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsSlugExistConstraint implements ValidatorConstraintInterface {
  constructor(private readonly taxonomiesService: TaxonomiesService) {
  }

  async validate(value: string, args?: ValidationArguments): Promise<boolean> {
    const [type, id] = args.constraints;
    if (!value) {
      // 允许为空
      return true;
    }
    return !(await this.taxonomiesService.checkTaxonomySlugExist(value, args.object[type], args.object[id])).isExist;
  }

  defaultMessage(args?: ValidationArguments): string {
    return '别名已存在';
  }
}

export function IsSlugExist(param: {typeField: string, idField?: string}, validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsSlugExist',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [param.typeField, param.idField],
      options: validationOptions,
      validator: IsSlugExistConstraint
    });
  };
}
