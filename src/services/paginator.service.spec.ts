import { Test, TestingModule } from '@nestjs/testing';
import PaginatorService from './paginator.service';

describe('PaginatorService', () => {
  let service: PaginatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginatorService],
    }).compile();

    service = module.get<PaginatorService>(PaginatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
