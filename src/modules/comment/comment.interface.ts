import { Order } from 'sequelize';
import { CommentStatus } from '../../common/common.enum';
import { CommentModel } from '../../models/comment.model';

export interface CommentEntity extends CommentModel {
  children: CommentEntity[];
}

export interface CommentList {
  comments: CommentEntity[];
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
