import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsNumber(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsNumber',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value === 'number') {
            return true;
          }
          if (typeof value === 'string') {
            return /^[+-]?\d+(?:.\d+)?$/i.test(value);
          }
          // 允许为空
          return !value || false;
        }
      }
    });
  };
}
