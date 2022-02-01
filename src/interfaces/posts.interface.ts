import PostModel from '../models/post.model';
import TaxonomyModel from '../models/taxonomy.model';

export interface PostVo {
  post: PostModel;
  meta: Record<string, string>;
  tags: TaxonomyModel[];
  categories: TaxonomyModel[];
}

export interface PostListVo {
  posts: PostVo[];
  page: number;
  count: number;
  postIds?: string[];
}

export interface PostStatusMap {
  name: string;
  desc: string;
}
