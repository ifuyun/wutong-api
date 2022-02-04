import { Test, TestingModule } from '@nestjs/testing';
import AdminLinkController from './admin-link.controller';

describe('LinkController', () => {
  let controller: AdminLinkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminLinkController],
    }).compile();

    controller = module.get<AdminLinkController>(AdminLinkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
