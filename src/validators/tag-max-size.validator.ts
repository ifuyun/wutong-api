import { registerDecorator, ValidationOptions } from 'class-validator';
import * as unique from 'lodash/uniq';

/**
 * 校验标签去重后的数量是否在范围内
 * @param options
 * @param validationOptions
 * @constructor
 */
export function TagMaxSize(options: { size: number, separator?: string | RegExp }, validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsId',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [options.size],
      options: validationOptions,
      validator: {
        validate(value: string | string[], args) {
          options.separator = options.separator || /[,\s]/i;
          if (typeof value === 'string') {
            const tags = unique(value.split(options.separator).filter((v) => v.trim()));
            args.constraints.push(tags.length);
            return tags.length <= options.size;
          }

          value = unique(value);
          args.constraints.push(value.length);
          return value.length <= options.size;
        }
      }
    });
  };
}
