import { registerDecorator, ValidationOptions } from 'class-validator';
import { getEnumValues } from '../helpers/helper';
import { PostSlugPrefixBlacklist } from '../common/common.enum';

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
          if (!value.startsWith('/')) {
            return false
          }
          if (!/^(?:\/[a-zA-Z0-9+-_.,~%]+)+$/i.test(value)) {
            return false
          }
          const blacklist = <string[]>getEnumValues(PostSlugPrefixBlacklist);
          for (let prefix of blacklist) {
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
