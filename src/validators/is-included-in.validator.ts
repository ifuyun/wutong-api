import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsIncludedIn(
  options: { ranges: (string | number)[], allowNull?: boolean, ignoreCase?: boolean },
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
        validate(value: string | number) {// todo: add error description
          // 默认忽略大小写
          if (typeof options.ignoreCase !== 'boolean') {
            options.ignoreCase = true;
          }
          if (options.ignoreCase && typeof value === 'string') {
            value = value.toLowerCase();
          }

          return options.allowNull && !value || options.ranges.includes(value);
        }
      }
    });
  };
}
