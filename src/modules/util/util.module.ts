import { Module } from '@nestjs/common';
import { UtilService } from './util.service';
import { WatermarkService } from './watermark.service';

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
