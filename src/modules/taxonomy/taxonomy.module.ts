import { Module } from '@nestjs/common';
import { ParseTokenPipe } from '../../pipes/parse-token.pipe';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { OptionModule } from '../option/option.module';
import { UserModule } from '../user/user.module';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    OptionModule,
    AuthModule,
    UserModule
  ],
  controllers: [TaxonomyController],
  providers: [
    TaxonomyService,
    ParseTokenPipe
  ],
  exports: [TaxonomyService]
})
export class TaxonomyModule {
}
