import { Module } from '@nestjs/common';
import { AdminLinkController } from './admin-link.controller';
import { LinksService } from './links.service';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { PaginatorModule } from '../paginator/paginator.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    CommonModule,
    PaginatorModule,
    TaxonomyModule,
    OptionModule
  ],
  controllers: [AdminLinkController],
  providers: [LinksService],
  exports: [LinksService]
})
export class LinkModule {
}
