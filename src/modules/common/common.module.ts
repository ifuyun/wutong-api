import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { EmailService } from './email.service';

@Module({
  imports: [
    OptionModule,
    LoggerModule
  ],
  providers: [EmailService],
  exports: [EmailService]
})
export class CommonModule {
}
