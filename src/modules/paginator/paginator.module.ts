import { Module } from '@nestjs/common';
import { PaginatorService } from './paginator.service';

@Module({
  imports: [],
  providers: [PaginatorService],
  exports: [PaginatorService]
})
export class PaginatorModule {
}
