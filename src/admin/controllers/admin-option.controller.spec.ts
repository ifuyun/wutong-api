import { Test, TestingModule } from '@nestjs/testing';
import AdminOptionController from './admin-option.controller';

describe('AdminOptionController', () => {
  let controller: AdminOptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOptionController],
    }).compile();

    controller = module.get<AdminOptionController>(AdminOptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
