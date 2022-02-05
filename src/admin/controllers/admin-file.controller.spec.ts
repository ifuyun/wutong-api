import { Test, TestingModule } from '@nestjs/testing';
import AdminFileController from './admin-file.controller';

describe('AdminFileController', () => {
  let controller: AdminFileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminFileController],
    }).compile();

    controller = module.get<AdminFileController>(AdminFileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
