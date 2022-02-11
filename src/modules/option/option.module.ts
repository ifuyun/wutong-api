import { Module } from '@nestjs/common';
import { AdminOptionController } from './admin-option.controller';
import { OptionsService } from './options.service';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    CommonModule
  ],
  controllers: [AdminOptionController],
  providers: [OptionsService],
  exports: [OptionsService]
})
export class OptionModule {
}
