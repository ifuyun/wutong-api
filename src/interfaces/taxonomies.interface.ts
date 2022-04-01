import { Order } from 'sequelize';
import { TaxonomyStatus, TaxonomyType } from '../common/common.enum';
import { TaxonomyModel } from '../models/taxonomy.model';

export interface TaxonomyEntity {
  name: string;
  description?: string;
  slug: string;
  taxonomyId: string;
  parentId?: string;
  status?: TaxonomyStatus;
  termOrder?: number;
  count?: number;
  hasChildren?: boolean;
}

export interface TaxonomyNode extends TaxonomyEntity {
  level?: number
  children?: TaxonomyNode[];
}

export interface TaxonomyList {
  taxonomies: TaxonomyModel[];
  page: number;
  total: number;
}

export interface TaxonomyStatusMap {
  name: string;
  desc: string;
}

export interface TaxonomyQueryParam {
  type: TaxonomyType | TaxonomyType[];
  status?: TaxonomyStatus[];
  page?: number;
  pageSize?: number;
  keyword?: string;
  orders?: Order;
}
