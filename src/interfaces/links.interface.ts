import { Order } from 'sequelize';
import { LinkStatus, LinkTarget, LinkScope } from '../common/common.enum';
import { LinkModel } from '../models/link.model';

export interface LinkListVo {
  links: LinkModel[];
  page: number;
  total: number;
}

export interface LinkQueryParam {
  page: number;
  pageSize?: number;
  keyword?: string;
  taxonomyId?: string;
  scope?: LinkScope | LinkScope[];
  status?: LinkStatus | LinkStatus[];
  target?: LinkTarget | LinkTarget[];
  orders?: Order;
}
