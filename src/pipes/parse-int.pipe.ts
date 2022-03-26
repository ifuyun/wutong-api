import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  private defaultValue: number;

  constructor(defaultValue?: number) {
    this.defaultValue = defaultValue;
  }

  transform(value: string | number, metadata: ArgumentMetadata): number {
    const intValue = typeof value === 'number' ? value : parseInt(value, 10);
    if (typeof this.defaultValue === 'number' && !isNaN(this.defaultValue)) {
      return isNaN(intValue) ? this.defaultValue : intValue;
    }
    return intValue;
  }
}
