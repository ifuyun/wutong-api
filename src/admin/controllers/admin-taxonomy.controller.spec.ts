import { Test, TestingModule } from '@nestjs/testing';
import AdminTaxonomyController from './admin-taxonomy.controller';

describe('AdminTaxonomyController', () => {
  let controller: AdminTaxonomyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTaxonomyController],
    }).compile();

    controller = module.get<AdminTaxonomyController>(AdminTaxonomyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
