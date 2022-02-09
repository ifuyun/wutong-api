import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * 因为Body参数默认是string，而transform无法对Body生效，
 * 且库自带的IsNumber对string直接返回false，因此重写判断
 */
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
