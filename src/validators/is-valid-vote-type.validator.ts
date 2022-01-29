import { registerDecorator, ValidationOptions } from 'class-validator';
import { VoteType } from '../common/enums';

export function IsValidVoteType(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsValidVoteType',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          return value === VoteType.LIKE || value === VoteType.DISLIKE;
        }
      }
    });
  };
}
