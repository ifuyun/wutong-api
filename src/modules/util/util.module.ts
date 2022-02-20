import { Module } from '@nestjs/common';
import { WatermarkService } from './watermark.service';
import { UtilService } from './util.service';

@Module({
  imports: [],
  providers: [
    UtilService,
    WatermarkService
  ],
  exports: [
    UtilService,
    WatermarkService
  ]
})
export class UtilModule {
}
