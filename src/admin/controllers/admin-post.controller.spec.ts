import { Test, TestingModule } from '@nestjs/testing';
import AdminPostController from './admin-post.controller';

describe('AdminPostController', () => {
  let controller: AdminPostController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPostController],
    }).compile();

    controller = module.get<AdminPostController>(AdminPostController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
