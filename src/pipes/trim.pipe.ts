import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export default class TrimPipe implements PipeTransform {
  transform(data: string | Record<string, any>, metadata: ArgumentMetadata): string | Record<string, any> {
    if (!data) {
      return '';
    }
    if (typeof data === 'string') {
      return data.trim();
    }
    const iterator = (obj: Record<string, any>) => {
      Object.keys(obj).forEach((k) => {
        if (typeof obj[k] === 'string') {
          obj[k] = obj[k].trim();
        } else if(obj[k]) {
          iterator(obj[k]);
        }
      });
      return obj;
    };
    data = iterator(data);
    return data;
  }
}
