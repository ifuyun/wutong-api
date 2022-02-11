import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrumbService } from './crumb.service';

@Module({
  imports: [ConfigModule],
  providers: [CrumbService],
  exports: [CrumbService]
})
export class CrumbModule {
}
