import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminOptionController } from './admin-option.controller';
import { OptionsService } from './options.service';
import { UtilModule } from '../util/util.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionController } from './option.controller';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    UtilModule,
    forwardRef(() => AuthModule)
  ],
  controllers: [AdminOptionController, OptionController],
  providers: [OptionsService],
  exports: [OptionsService]
})
export class OptionModule {
}
