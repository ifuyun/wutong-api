import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CommentStatus, CommentStatusDesc } from '../../common/common.enum';
import { CommentDto } from '../../dtos/comment.dto';
import { getEnumKeyByValue, getUuid } from '../../helpers/helper';
import { CommentListVo, CommentStatusMap } from '../../interfaces/comments.interface';
import { CommentModel } from '../../models/comment.model';
import { PostModel } from '../../models/post.model';
import { PaginatorService } from '../paginator/paginator.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel,
    private readonly paginatorService: PaginatorService
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
      attributes: ['postId', [Sequelize.fn('count', 1), 'count']],
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
        result[comment.postId] = <number> comment.get('count');
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

  async getComments(param: { page: number, status?: string, keyword?: string }): Promise<CommentListVo> {
    const { keyword, status } = param;
    const pageSize = this.paginatorService.getPageSize();
    const where = {};
    if (status) {
      where['commentStatus'] = {
        [Op.eq]: status
      };
    }
    if (keyword) {
      where['commentContent'] = {
        [Op.like]: `%${keyword}%`
      };
    }
    const count = await this.commentModel.count({ where });
    const page = Math.max(Math.min(param.page, Math.ceil(count / pageSize)), 1);

    const comments = await this.commentModel.findAll({
      where,
      include: [{
        model: PostModel,
        attributes: ['postId', 'postGuid', 'postTitle']
      }],
      order: [['created', 'desc']],
      limit: pageSize,
      offset: pageSize * (page - 1),
      subQuery: false
    });
    comments.forEach((comment) => {
      // todo: time format changes to config
      comment.createdText = moment(comment.created).format('YYYY-MM-DD HH:mm');
      comment.commentStatusDesc = CommentStatusDesc[getEnumKeyByValue(CommentStatus, comment.commentStatus)];
    });

    return {
      comments, page, count
    };
  }

  async auditComment(commentId: string, status: string): Promise<[number, CommentModel[]]> {
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
    const count = await this.commentModel.count({
      where: {
        commentId: {
          [Op.eq]: commentId
        }
      }
    });
    return count > 0;
  }
}
