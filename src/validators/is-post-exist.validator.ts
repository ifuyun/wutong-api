import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import PostsService from '../services/posts.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsPostExistConstraint implements ValidatorConstraintInterface {
  constructor(private readonly postsService: PostsService) {
  }

  async validate(value: string, args?: ValidationArguments): Promise<boolean> {
    if (!value) {
      // 允许为空
      return true;
    }
    return await this.postsService.checkPostExist(value);
  }

  defaultMessage(args?: ValidationArguments): string {
    return '文章不存在';
  }
}

export function IsPostExist(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsPostExist',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: IsPostExistConstraint
    });
  };
}
