import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export default class ParseIntPipe implements PipeTransform<string, number> {
  private defaultValue: number = 0;

  constructor(defaultValue?: number) {
    this.defaultValue = defaultValue;
  }

  transform(value: string, metadata: ArgumentMetadata): number {
    return parseInt(value, 10) || this.defaultValue;
  }
}
