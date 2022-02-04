import { Test, TestingModule } from '@nestjs/testing';
import AdminCommentController from './admin-comment.controller';

describe('AdminCommentController', () => {
  let controller: AdminCommentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCommentController],
    }).compile();

    controller = module.get<AdminCommentController>(AdminCommentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
