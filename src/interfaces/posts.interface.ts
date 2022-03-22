import { Order } from 'sequelize';
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
  total: number;
  postIds?: string[];
}

export interface PostStatusMap {
  name: string;
  desc: string;
}

export interface PostQueryParam {
  page: number;
  pageSize?: number;
  isAdmin: boolean;
  from?: string;
  postType?: PostType;
  keyword?: string;
  subTaxonomyIds?: string[];
  tag?: string;
  year?: string;
  month?: string;
  status?: PostStatus;
  author?: string;
  orders?: Order;
}
