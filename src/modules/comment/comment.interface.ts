import { Order } from 'sequelize';
import { CommentStatus } from '../../common/common.enum';
import { CommentModel } from '../../models/comment.model';

export interface CommentListVo {
  comments: CommentModel[];
  page: number;
  total: number;
}

export interface CommentQueryParam {
  page: number;
  pageSize?: number;
  fromAdmin?: boolean;
  postId?: string;
  keyword?: string;
  status?: CommentStatus[];
  orders?: Order;
}

export interface CommentAuditParam {
  commentIds: string[];
  action: CommentStatus;
}