import { Order } from 'sequelize';
import { TaxonomyStatus, TaxonomyType } from '../common/common.enum';
import { TaxonomyModel } from '../models/taxonomy.model';

export interface TaxonomyNode extends TaxonomyModel {
  children?: TaxonomyNode[];
  isLeaf?: boolean;
}

export interface TaxonomyList {
  taxonomies: TaxonomyModel[];
  page: number;
  total: number;
}

export interface TaxonomyQueryParam {
  type: TaxonomyType | TaxonomyType[];
  status?: TaxonomyStatus | TaxonomyStatus[];
  page?: number;
  pageSize?: number;
  keyword?: string;
  orders?: Order;
}
