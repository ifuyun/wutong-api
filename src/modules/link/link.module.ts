import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { LinkController } from './link.controller';
import { LinkService } from './link.service';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    TaxonomyModule,
    OptionModule,
    AuthModule
  ],
  controllers: [LinkController],
  providers: [LinkService],
  exports: [LinkService]
})
export class LinkModule {
}
