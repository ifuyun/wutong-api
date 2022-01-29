import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import Sequelize, { Op } from 'sequelize';
import CommentDto from '../dtos/comment.dto';
import { getUuid } from '../helpers/helper';
import CommentModel from '../models/comment.model';

@Injectable()
export default class CommentsService {
  constructor(
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel
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
      return this.commentModel.create({...commentDto}).then((comment) => Promise.resolve([comment]));
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
    return this.commentModel.findByPk(commentId);
  }
}
