import { Injectable } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { CommentsService } from '../../modules/comment/comments.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsCommentExistConstraint implements ValidatorConstraintInterface {
  constructor(private readonly commentsService: CommentsService) {
  }

  async validate(value: string, args?: ValidationArguments): Promise<boolean> {
    if (!value) {
      // 允许为空
      return true;
    }
    return await this.commentsService.checkCommentExist(value);
  }

  defaultMessage(args?: ValidationArguments): string {
    return '评论不存在';
  }
}

export function IsCommentExist(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsCommentExist',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: IsCommentExistConstraint
    });
  };
}
