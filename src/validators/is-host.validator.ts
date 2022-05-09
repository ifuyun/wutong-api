import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsHost(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsHost',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          return !value || /^(https?:\/\/)?[a-zA-Z0-9_\-]+(?:\.[a-zA-Z0-9_\-]+)*(?::\d{2,5})?\/?$/i.test(value);
        }
      }
    });
  };
}
