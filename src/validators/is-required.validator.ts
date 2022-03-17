import { registerDecorator, ValidationOptions } from 'class-validator';
import { trim } from 'lodash';

export function IsRequired(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsRequired',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value === 'string') {
            return !!trim(value);
          }
          if (typeof value === 'number') {
            return !isNaN(value);
          }
          return !!value;
        }
      }
    });
  };
}
