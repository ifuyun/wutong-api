import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsId(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsId',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          return !value || /^[0-9a-fA-F]{16}$/i.test(value);
        }
      }
    });
  };
}
