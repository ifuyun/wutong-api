import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { PostService } from '../../modules/post/post.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsPostExistConstraint implements ValidatorConstraintInterface {
  constructor(private readonly postService: PostService) {
  }

  async validate(value: string, args?: ValidationArguments): Promise<boolean> {
    if (!value) {
      // 允许为空
      return true;
    }
    return await this.postService.checkPostExist(value);
  }

  defaultMessage(args?: ValidationArguments): string {
    return '内容不存在';
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
