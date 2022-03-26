import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  private defaultValue: number;

  constructor(defaultValue?: number) {
    this.defaultValue = defaultValue;
  }

  transform(value: string, metadata: ArgumentMetadata): number {
    if (typeof this.defaultValue === 'number') {
      const intValue = parseInt(value, 10);
      return isNaN(intValue) ? this.defaultValue : intValue;
    }
    return parseInt(value, 10);
  }
}
