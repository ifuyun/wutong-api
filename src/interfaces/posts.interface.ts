import { PostModel } from '../models/post.model';
import { TaxonomyModel } from '../models/taxonomy.model';
import { PostStatus, PostType } from '../common/common.enum';

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

export interface PostQueryParam {
  page: number,
  isAdmin: boolean,
  postType?: PostType,
  from?: string,
  keyword?: string,
  subTaxonomyIds?: string[],
  tag?: string;
  year?: string;
  month?: string;
  status?: PostStatus;
  author?: string;
}
