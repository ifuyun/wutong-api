import { Test, TestingModule } from '@nestjs/testing';
import { CrumbService } from './crumb.service';

describe('CrumbService', () => {
  let service: CrumbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrumbService],
    }).compile();

    service = module.get<CrumbService>(CrumbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
