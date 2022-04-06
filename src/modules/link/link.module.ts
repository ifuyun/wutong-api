import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { UtilModule } from '../util/util.module';
import { LinkController } from './link.controller';
import { LinksService } from './links.service';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    UtilModule,
    TaxonomyModule,
    OptionModule,
    AuthModule
  ],
  controllers: [LinkController],
  providers: [LinksService],
  exports: [LinksService]
})
export class LinkModule {
}
