import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CommentFlag, CommentStatus } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { CommentDto } from '../../dtos/comment.dto';
import { UnknownException } from '../../exceptions/unknown.exception';
import { getUuid } from '../../helpers/helper';
import { CommentModel } from '../../models/comment.model';
import { PostModel } from '../../models/post.model';
import { LoggerService } from '../logger/logger.service';
import { CommentListVo, CommentQueryParam } from './comment.interface';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel,
    @InjectModel(PostModel)
    private readonly postModel: typeof PostModel,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
  }

  async saveComment(commentDto: CommentDto): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      if (!commentDto.commentId) {
        commentDto.commentId = getUuid();
        await this.commentModel.create({ ...commentDto }, {
          transaction: t
        });
        const post = await this.postModel.findByPk(commentDto.postId);
        if (post.commentFlag === CommentFlag.OPEN) {
          await this.postModel.increment({ commentCount: 1 }, {
            where: {
              postId: commentDto.postId
            },
            transaction: t
          });
        }
      } else {
        const comment = await this.commentModel.findByPk(commentDto.commentId);
        if (comment.commentStatus === CommentStatus.NORMAL && commentDto.commentStatus !== CommentStatus.NORMAL) {
          await this.postModel.decrement({ commentCount: 1 }, {
            where: {
              postId: commentDto.postId
            },
            transaction: t
          });
        } else if (comment.commentStatus !== CommentStatus.NORMAL && commentDto.commentStatus === CommentStatus.NORMAL) {
          await this.postModel.increment({ commentCount: 1 }, {
            where: {
              postId: commentDto.postId
            },
            transaction: t
          });
        }
        await this.commentModel.update(commentDto, {
          where: {
            commentId: {
              [Op.eq]: commentDto.commentId
            }
          },
          transaction: t
        });
      }
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '评论保存失败',
        data: commentDto,
        stack: err.stack
      });
      return Promise.resolve(false);
    });
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
    const { fromAdmin, postId, keyword, status, orders } = param;
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
    if (fromAdmin) {
      if (status && status.length > 0) {
        where['commentStatus'] = {
          [Op.in]: status
        };
      } else {
        delete where['commentStatus'];
      }
      if (keyword) {
        where['commentContent'] = {
          [Op.like]: `%${keyword}%`
        };
      }
    }
    const total = await this.commentModel.count({ where });
    const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);

    if (fromAdmin) {
      limitOpt['limit'] = pageSize;
      limitOpt['offset'] = pageSize * (page - 1);
    }
    const comments = await this.commentModel.findAll({
      where,
      include: [{
        model: PostModel,
        attributes: ['postId', 'postGuid', 'postTitle']
      }],
      order: orders || [['commentCreated', 'desc']],
      subQuery: false,
      ...limitOpt
    });

    return {
      comments, page, total
    };
  }

  async auditComment(commentIds: string[], status: CommentStatus): Promise<boolean> {
    return this.commentModel.update({
      commentStatus: status
    }, {
      where: {
        commentId: {
          [Op.in]: commentIds
        }
      }
    })
      .then((result) => Promise.resolve(true))
      .catch((err) => {
        this.logger.error({
          message: '评论修改失败',
          data: { commentIds, status },
          stack: err.stack
        });
        throw new UnknownException(Message.COMMENT_AUDIT_ERROR);
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

  async countComments(): Promise<number> {
    return this.commentModel.count({
      where: {
        commentStatus: [CommentStatus.NORMAL, CommentStatus.PENDING, CommentStatus.REJECT, CommentStatus.SPAM]
      }
    });
  }

  async getRecentComments(limit?: number): Promise<CommentModel[]> {
    return this.commentModel.findAll({
      where: {
        commentStatus: [CommentStatus.NORMAL, CommentStatus.PENDING]
      },
      include: [{
        model: PostModel,
        attributes: ['postId', 'postGuid', 'postTitle']
      }],
      order: [['commentCreated', 'desc']],
      limit: limit || 5,
      offset: 0
    });
  }
}
