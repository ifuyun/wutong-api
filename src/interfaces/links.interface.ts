import { Order } from 'sequelize';
import { LinkVisible } from '../common/common.enum';
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
  visible?: LinkVisible | LinkVisible[];
  orders?: Order;
}
