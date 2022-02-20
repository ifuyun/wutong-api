import { Module } from '@nestjs/common';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomiesService } from './taxonomies.service';
import { UtilModule } from '../util/util.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { PaginatorModule } from '../paginator/paginator.module';
import { ParseTokenPipe } from '../../pipes/parse-token.pipe';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    PaginatorModule,
    UtilModule,
    OptionModule,
    AuthModule,
    UserModule
  ],
  controllers: [TaxonomyController],
  providers: [
    TaxonomiesService,
    ParseTokenPipe
  ],
  exports: [TaxonomiesService]
})
export class TaxonomyModule {
}
