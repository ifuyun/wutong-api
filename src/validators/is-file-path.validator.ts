import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsFilePath(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsFilePath',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          return !value || /^(?:\/|((?:\/[a-zA-Z0-9\-_. ]+)*(?:\.[a-zA-Z0-9]+)?))$/i.test(value);
        }
      }
    });
  };
}
