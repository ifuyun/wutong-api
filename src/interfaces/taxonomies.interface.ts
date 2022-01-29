export interface TaxonomyNode {
  name?: string;
  description?: string;
  slug?: string;
  count?: number;
  taxonomyId?: string;
  parentId?: string;
  status?: number;
  level?: number
  children?: Record<string, TaxonomyNode>;
  hasChildren?: boolean;
}

export interface TaxonomyTree {
  taxonomyData: TaxonomyNode[];
  taxonomyTree: Record<string, TaxonomyNode>;
  taxonomyList: TaxonomyNode[];
}
