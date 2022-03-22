import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import { FindOptions, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CommentStatus, CommentStatusDesc } from '../../common/common.enum';
import { CommentDto } from '../../dtos/comment.dto';
import { getUuid } from '../../helpers/helper';
import { CommentListVo, CommentQueryParam, CommentStatusMap } from '../../interfaces/comments.interface';
import { CommentModel } from '../../models/comment.model';
import { PostModel } from '../../models/post.model';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel
  ) {
  }

  getAllCommentStatus(): CommentStatusMap[] {
    const status: CommentStatusMap[] = [];
    Object.keys(CommentStatus).forEach((key) => {
      status.push({
        name: CommentStatus[key],
        desc: CommentStatusDesc[key]
      });
    });
    return status;
  }

  async getCommentCountByPosts(postIds: string[]): Promise<Record<string, number>> {
    return this.commentModel.findAll({
      attributes: ['postId', [Sequelize.fn('count', 1), 'total']],
      where: {
        postId: postIds,
        commentStatus: {
          [Op.eq]: 'normal'
        }
      },
      group: ['postId']
    }).then((comments) => {
      let result: Record<string, number> = {};
      comments.forEach((comment) => {
        result[comment.postId] = <number>comment.get('total');
      });
      return Promise.resolve(result);
    });
  }

  async getCommentsByPostId(postId: string): Promise<CommentModel[]> {
    return this.commentModel.findAll({
      attributes: ['commentId', 'commentContent', 'commentAuthor', 'commentVote', 'created'],
      where: {
        postId: {
          [Op.eq]: postId
        },
        commentStatus: {
          [Op.eq]: 'normal'
        }
      },
      order: [
        ['created', 'desc']
      ]
    }).then((comments) => {
      // todo: to be removed
      comments.map((comment) => {
        comment.createdText = moment(comment.created).format('YYYY-MM-DD HH:mm');
      });
      return Promise.resolve(comments);
    });
  }

  async saveComment(commentDto: CommentDto): Promise<number> {
    if (!commentDto.commentId) {
      commentDto.commentId = getUuid();
      return this.commentModel.create({ ...commentDto }).then((comment) => Promise.resolve(1));
    }
    return this.commentModel.update(commentDto, {
      where: {
        commentId: {
          [Op.eq]: commentDto.commentId
        }
      }
    }).then((result) => Promise.resolve(result[0]));
  }

  async getCommentById(commentId: string): Promise<CommentModel> {
    return this.commentModel.findByPk(commentId, {
      include: [{
        model: PostModel,
        attributes: ['postId', 'postGuid', 'postTitle']
      }]
    });
  }

  async getComments(param: CommentQueryParam): Promise<CommentListVo> {
    const { isAdmin, from, postId, keyword, status, orders } = param;
    const pageSize = param.pageSize || 10;
    const where = {
      commentStatus: {
        [Op.in]: [CommentStatus.NORMAL]
      }
    };
    if (postId) {
      where['postId'] = postId;
    }
    const limitOpt: FindOptions = {};
    if (isAdmin && from === 'admin') {
      if (status) {
        where['commentStatus'] = {
          [Op.in]: [status]
        };
      } else {
        where['commentStatus'] = {
          [Op.in]: [CommentStatus.PENDING, CommentStatus.NORMAL]
        };
      }
      if (keyword) {
        where['commentContent'] = {
          [Op.like]: `%${keyword}%`
        };
      }
    }
    const total = await this.commentModel.count({ where });
    const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);

    if (isAdmin && from === 'admin') {
      limitOpt['limit'] = pageSize;
      limitOpt['offset'] = pageSize * (page - 1);
    }
    const comments = await this.commentModel.findAll({
      where,
      include: [{
        model: PostModel,
        attributes: ['postId', 'postGuid', 'postTitle']
      }],
      order: orders || [['created', 'desc']],
      subQuery: false,
      ...limitOpt
    });

    return {
      comments, page, total
    };
  }

  async auditComment(commentId: string, status: string): Promise<[number]> {
    return this.commentModel.update({
      commentStatus: status
    }, {
      where: {
        commentId: {
          [Op.eq]: commentId
        }
      }
    });
  }

  async checkCommentExist(commentId: string): Promise<boolean> {
    const total = await this.commentModel.count({
      where: {
        commentId: {
          [Op.eq]: commentId
        }
      }
    });
    return total > 0;
  }
}
