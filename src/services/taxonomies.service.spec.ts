import { Test, TestingModule } from '@nestjs/testing';
import TaxonomiesService from './taxonomies.service';

describe('TaxonomiesService', () => {
  let service: TaxonomiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxonomiesService],
    }).compile();

    service = module.get<TaxonomiesService>(TaxonomiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
