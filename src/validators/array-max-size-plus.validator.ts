import { registerDecorator, ValidationOptions } from 'class-validator';
import * as unique from 'lodash/uniq';

/**
 * 校验数组元素或分隔符分隔的字符串去重后的数量是否在范围内
 * @param options
 * @param validationOptions
 * @constructor
 */
export function ArrayMaxSizePlus(options: { size: number, separator?: string | RegExp }, validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'ArrayMaxSizePlus',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [options.size],
      options: validationOptions,
      validator: {
        validate(value: string | string[], args) {
          options.separator = options.separator || ',';
          if (typeof value === 'string') {
            value = value.split(options.separator);
          }

          value = unique(value.filter((v) => v.trim()));
          args.constraints.push(value.length);
          return value.length <= options.size;
        }
      }
    });
  };
}
