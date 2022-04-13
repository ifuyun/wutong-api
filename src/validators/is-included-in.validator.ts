import { registerDecorator, ValidationOptions } from 'class-validator';
import { Message } from '../common/message.enum';
import { BadRequestException } from '../exceptions/bad-request.exception';

export function IsIncludedIn(
  options: { ranges: (string | number)[], allowNull?: boolean, ignoreCase?: boolean },
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsIncludedIn',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string | number, args) {
          args.constraints.push(value);

          if (!options.ranges || !Array.isArray(options.ranges)) {
            throw new BadRequestException(Message.PARAM_MUST_BE_ARRAY);
          }
          // 默认忽略大小写
          if (typeof options.ignoreCase !== 'boolean') {
            options.ignoreCase = true;
          }
          if (options.ignoreCase && typeof value === 'string') {
            value = value.toLowerCase();
          }

          return options.allowNull && (value === undefined || value === null) || options.ranges.includes(value);
        }
      }
    });
  };
}
