import { CommentModel } from '../models/comment.model';

export interface CommentStatusMap {
  name: string;
  desc: string;
}

export interface CommentListVo {
  comments: CommentModel[];
  page: number;
  count: number;
}
