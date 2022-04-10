import { registerDecorator, ValidationOptions } from 'class-validator';
import { PostSlugPrefixBlacklist } from '../common/common.enum';
import { getEnumValues } from '../helpers/helper';

export function IsGuid(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsGuid',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (value && !value.startsWith('/')) {
            return false;
          }
          if (value && !/^(?:\/[a-zA-Z0-9\-+_.,~%]+)+$/i.test(value)) {
            return false;
          }
          const blacklist = <string[]> getEnumValues(PostSlugPrefixBlacklist);
          for (const prefix of blacklist) {
            if (value.startsWith(prefix)) {
              return false;
            }
          }
          return true;
        }
      }
    });
  };
}
