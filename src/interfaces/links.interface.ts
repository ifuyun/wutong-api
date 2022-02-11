import { LinkModel } from '../models/link.model';

export interface LinkListVo {
  links: LinkModel[];
  page: number;
  count: number;
}
