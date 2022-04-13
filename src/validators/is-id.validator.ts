import { registerDecorator, ValidationOptions } from 'class-validator';
import { ID_REG } from '../common/constants';

export function IsId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsId',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string | string[], args) {
          args.constraints.push(value);

          if (!value) {
            return true;
          }
          if (typeof value === 'string') {
            return ID_REG.test(value);
          }

          return value.every((item) => ID_REG.test(item));
        }
      }
    });
  };
}
