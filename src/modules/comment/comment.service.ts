import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op } from 'sequelize';
import { CommentStatus, CommentStatusDesc } from '../../common/common.enum';
import { CommentDto } from '../../dtos/comment.dto';
import { getUuid } from '../../helpers/helper';
import { CommentListVo, CommentQueryParam, CommentStatusMap } from '../../interfaces/comments.interface';
import { CommentModel } from '../../models/comment.model';
import { PostModel } from '../../models/post.model';

@Injectable()
export class CommentService {
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

  async saveComment(commentDto: CommentDto): Promise<number> {
    // todo: update comment count of post
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
      order: orders || [['created', 'desc']],
      subQuery: false,
      ...limitOpt
    });

    return {
      comments, page, total
    };
  }

  async auditComment(commentIds: string[], status: string): Promise<[affectedCount: number]> {
    // todo: update comment count of post
    return this.commentModel.update({
      commentStatus: status
    }, {
      where: {
        commentId: {
          [Op.in]: commentIds
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
