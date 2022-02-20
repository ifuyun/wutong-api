import { Module } from '@nestjs/common';
import { CrumbService } from './crumb.service';

@Module({
  imports: [],
  providers: [CrumbService],
  exports: [CrumbService]
})
export class CrumbModule {
}
