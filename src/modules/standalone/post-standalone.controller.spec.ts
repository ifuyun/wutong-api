import { Test, TestingModule } from '@nestjs/testing';
import PostStandaloneController from './post-standalone.controller';

describe('PostStandaloneController', () => {
  let controller: PostStandaloneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostStandaloneController],
    }).compile();

    controller = module.get<PostStandaloneController>(PostStandaloneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
