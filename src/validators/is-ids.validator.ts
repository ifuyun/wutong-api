import { registerDecorator, ValidationOptions } from 'class-validator';
import { ID_REG } from '../common/constants';

export function IsIds(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsIds',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(values: string[]) {
          let result: boolean = true;
          for (let v of values) {
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
