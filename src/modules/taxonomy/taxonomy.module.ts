import { Module } from '@nestjs/common';
import { AdminTaxonomyController } from './admin-taxonomy.controller';
import { TaxonomiesService } from './taxonomies.service';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { PaginatorModule } from '../paginator/paginator.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    PaginatorModule,
    CommonModule,
    OptionModule
  ],
  controllers: [AdminTaxonomyController],
  providers: [TaxonomiesService],
  exports: [TaxonomiesService]
})
export class TaxonomyModule {
}
