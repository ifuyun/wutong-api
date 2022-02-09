import { registerDecorator, ValidationOptions } from 'class-validator';
import { ID_REG } from '../common/constants';

export function IsId(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsId',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string | string[]) {
          if (typeof value === 'string') {
            return !value || ID_REG.test(value);
          }

          let result: boolean = true;
          for (let v of value) {
            result = ID_REG.test(v);
            if (!result) {
              break;
            }
          }
          return result;
        }
      }
    });
  };
}
