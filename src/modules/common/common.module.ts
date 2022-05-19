import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { EmailService } from './email.service';
import { IpService } from './ip.service';

@Module({
  imports: [
    OptionModule,
    LoggerModule,
    HttpModule
  ],
  providers: [
    EmailService,
    IpService
  ],
  exports: [
    EmailService,
    IpService
  ]
})
export class CommonModule {
}
