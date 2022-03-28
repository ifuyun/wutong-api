import { Order } from 'sequelize';
import { TaxonomyStatus } from '../common/common.enum';
import { TaxonomyModel } from '../models/taxonomy.model';

export interface TaxonomyEntity {
  name: string;
  description?: string;
  slug: string;
  taxonomyId: string;
  parentId?: string;
  status?: number;
  termOrder?: number;
  count?: number;
  hasChildren?: boolean;
}

export interface TaxonomyNode extends TaxonomyEntity {
  level?: number
  children?: TaxonomyNode[];
  isChecked?: boolean;
}

export interface TaxonomyMap {
  taxonomyData: TaxonomyEntity[];
  taxonomyTree: TaxonomyNode[];
  taxonomyList: TaxonomyNode[];
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
  type: string;
  status?: TaxonomyStatus[];
  page: number;
  pageSize?: number;
  keyword?: string;
  orders?: Order;
}
