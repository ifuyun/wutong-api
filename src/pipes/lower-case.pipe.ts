import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export default class LowerCasePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  }
}
