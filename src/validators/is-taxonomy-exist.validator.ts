import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import TaxonomiesService from '../services/taxonomies.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsTaxonomyExistConstraint implements ValidatorConstraintInterface {
  constructor(private readonly taxonomiesService: TaxonomiesService) {
  }

  async validate(value: string, args?: ValidationArguments): Promise<boolean> {
    if (!value) {
      // 允许为空
      return true;
    }
    return await this.taxonomiesService.checkTaxonomyExist(value);
  }

  defaultMessage(args?: ValidationArguments): string {
    return '分类不存在';
  }
}

export function IsTaxonomyExist(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsTaxonomyExist',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: IsTaxonomyExistConstraint
    });
  };
}
