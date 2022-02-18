import { Module } from '@nestjs/common';
import { LinkController } from './link.controller';
import { LinksService } from './links.service';
import { UtilModule } from '../util/util.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { PaginatorModule } from '../paginator/paginator.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    UtilModule,
    PaginatorModule,
    TaxonomyModule,
    OptionModule
  ],
  controllers: [LinkController],
  providers: [LinksService],
  exports: [LinksService]
})
export class LinkModule {
}
