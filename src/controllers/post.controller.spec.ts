import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from './post.controller';
import { AppService } from '../services/app.service';

describe('PostController', () => {
  let postController: PostController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [AppService],
    }).compile();

    postController = app.get<PostController>(PostController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(postController.Hello()).toBe('Yes, I can do it...!');
    });
  });
});
