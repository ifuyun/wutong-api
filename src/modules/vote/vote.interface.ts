import { Order } from 'sequelize';
import { VoteType } from '../../common/common.enum';
import { CommentModel } from '../../models/comment.model';
import { PostModel } from '../../models/post.model';
import { VoteModel } from '../../models/vote.model';

export interface VoteEntity {
  voteId: string;
  objectId: string;
  comment: CommentModel;
  post: PostModel;
  postMeta: Record<string, string>;
  objectType: VoteType;
  voteResult: number;
  voteCreated: Date;
  userId: string;
  userIp: string;
  userAgent: string;
}

export interface VoteList {
  votes: VoteModel[];
  page: number;
  total: number;
}

export interface VoteQueryParam {
  page: number;
  pageSize?: number;
  type?: VoteType[];
  ip?: string;
  keyword?: string;
  orders?: Order;
}
