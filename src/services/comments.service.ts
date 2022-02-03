import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import Sequelize, { Op } from 'sequelize';
import PaginatorService from './paginator.service';
import UtilService from './util.service';
import { CommentStatus, CommentStatusDesc } from '../common/enums';
import CommentDto from '../dtos/comment.dto';
import { getUuid } from '../helpers/helper';
import { CommentListVo, CommentStatusMap } from '../interfaces/comments.interface';
import CommentModel from '../models/comment.model';
import PostModel from '../models/post.model';

@Injectable()
export default class CommentsService {
  constructor(
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel,
    private readonly utilService: UtilService,
    private readonly paginatorService: PaginatorService
  ) {
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
      attributes: ['commentId', 'commentContent', 'commentAuthor', 'commentVote', 'commentCreated'],
      where: {
        postId: {
          [Op.eq]: postId
        },
        commentStatus: {
          [Op.eq]: 'normal'
        }
      },
      order: [
        ['commentCreated', 'desc']
      ]
    }).then((comments) => {
      comments.map((comment) => {
        comment.commentCreatedText = moment(comment.commentCreated).format('YYYY-MM-DD HH:mm');
      });
      return Promise.resolve(comments);
    });
  }

  async saveComment(commentDto: CommentDto): Promise<CommentModel[]> {
    if (!commentDto.commentId) {
      commentDto.commentId = getUuid();
      commentDto.commentCreatedGmt = commentDto.commentModifiedGmt = new Date();
      return this.commentModel.create({ ...commentDto }).then((comment) => Promise.resolve([comment]));
    }
    return this.commentModel.update(commentDto, {
      where: {
        commentId: {
          [Op.eq]: commentDto.commentId
        }
      }
    }).then((comment) => Promise.resolve(comment[0] > 0 ? comment[1] : []));
  }

  async getCommentById(commentId: string): Promise<CommentModel> {
    return this.commentModel.findByPk(commentId, {
      include: [{
        model: PostModel,
        attributes: ['postId', 'postGuid', 'postTitle']
      }]
    });
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
      order: [['commentCreated', 'desc']],
      limit: pageSize,
      offset: pageSize * (page - 1),
      subQuery: false
    });
    comments.forEach((comment) => {
      // todo: time format changes to config
      comment.commentCreatedText = moment(comment.commentCreated).format('YYYY-MM-DD HH:mm');
      comment.commentStatusDesc = CommentStatusDesc[this.utilService.getEnumKeyByValue(CommentStatus, comment.commentStatus)];
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
}
