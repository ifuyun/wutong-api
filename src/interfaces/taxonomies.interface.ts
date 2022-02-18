import { TaxonomyModel } from '../models/taxonomy.model';

export interface TaxonomyEntity {
  name: string;
  description?: string;
  slug: string;
  taxonomyId: string;
  parentId?: string;
  status?: number;
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

export interface TaxonomyListVo {
  taxonomies: TaxonomyModel[];
  page: number;
  count: number;
}

export interface TaxonomyStatusMap {
  name: string;
  desc: string;
}
