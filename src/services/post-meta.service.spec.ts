import { Test, TestingModule } from '@nestjs/testing';
import PostMetaService from './post-meta.service';

describe('PostMetaService', () => {
  let service: PostMetaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostMetaService],
    }).compile();

    service = module.get<PostMetaService>(PostMetaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
