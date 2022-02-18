import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WatermarkService } from './watermark.service';
import { UtilService } from './util.service';

@Module({
  imports: [ConfigModule],
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
