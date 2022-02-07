import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsIncludedIn(
  options: { ranges: (string | number)[], allowNull?: boolean },
  validationOptions?: ValidationOptions
) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsIncludedIn',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string | number) {
          // todo: add error description
          return options.allowNull && !value || options.ranges.includes(value);
        }
      }
    });
  };
}
