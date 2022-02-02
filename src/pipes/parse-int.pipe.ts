import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export default class ParseIntPipe implements PipeTransform<string, number> {
  private defaultValue: number;

  constructor(defaultValue?: number) {
    this.defaultValue = defaultValue;
  }

  transform(value: string, metadata: ArgumentMetadata): number {
    if (typeof this.defaultValue === 'number') {
      return parseInt(value, 10) || this.defaultValue;
    }
    return parseInt(value, 10);
  }
}
