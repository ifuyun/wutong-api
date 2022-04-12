import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionController } from './option.controller';
import { OptionService } from './option.service';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    forwardRef(() => AuthModule)
  ],
  controllers: [OptionController],
  providers: [OptionService],
  exports: [OptionService]
})
export class OptionModule {
}
