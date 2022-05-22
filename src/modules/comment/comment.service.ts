import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import { FindOptions, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CommentFlag, CommentStatus } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { CommentDto } from '../../dtos/comment.dto';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { format, generateId } from '../../helpers/helper';
import { CommentMetaModel } from '../../models/comment-meta.model';
import { CommentModel } from '../../models/comment.model';
import { PostModel } from '../../models/post.model';
import { EmailService } from '../common/email.service';
import { IPLocation } from '../common/ip.interface';
import { LoggerService } from '../logger/logger.service';
import { OptionEntity } from '../option/option.interface';
import { OptionService } from '../option/option.service';
import { CommentListVo, CommentQueryParam } from './comment.interface';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel,
    @InjectModel(CommentMetaModel)
    private readonly commentMetaModel: typeof CommentMetaModel,
    @InjectModel(PostModel)
    private readonly postModel: typeof PostModel,
    private readonly optionService: OptionService,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
  }

  async saveComment(commentDto: CommentDto, isNew: boolean, userLocation: IPLocation | null): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      if (isNew) {
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
        if (userLocation) {
          await this.commentMetaModel.create({
            metaId: generateId(),
            commentId: commentDto.commentId,
            metaKey: 'user_location',
            metaValue: JSON.stringify(userLocation)
          }, { transaction: t });
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
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '评论保存失败',
        data: commentDto,
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getCommentById(commentId: string): Promise<CommentModel> {
    return this.commentModel.findByPk(commentId, {
      include: [{
        model: PostModel,
        attributes: ['postId', 'postGuid', 'postTitle']
      }]
    }).catch((e) => {
      this.logger.error({
        message: e.message || '评论查询失败',
        data: { commentId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getCommentsByIds(commentIds: string[]): Promise<CommentModel[]> {
    return this.commentModel.findAll({
      where: {
        commentId: commentIds
      },
      include: [{
        model: PostModel,
        attributes: ['postId', 'postGuid', 'postTitle']
      }]
    }).catch((e) => {
      this.logger.error({
        message: e.message || '评论查询失败',
        data: { commentIds },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getComments(param: CommentQueryParam): Promise<CommentListVo> {
    const { fromAdmin, postId, keyword, status, orders } = param;
    const pageSize = param.pageSize || 10;
    const where = {};
    if (postId) {
      where['postId'] = postId;
    }
    const limitOpt: FindOptions = {};
    if (fromAdmin) {
      if (status && status.length > 0) {
        where['commentStatus'] = status;
      }
      if (keyword) {
        where['commentContent'] = {
          [Op.like]: `%${keyword}%`
        };
      }
    }
    if (!where['commentStatus'] && !fromAdmin) {
      where['commentStatus'] = CommentStatus.NORMAL;
    }
    try {
      const total = await this.commentModel.count({ where });
      const page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);

      if (fromAdmin) {
        limitOpt['limit'] = pageSize;
        limitOpt['offset'] = pageSize * (page - 1);
      }
      let excluded: string[] = [];
      if (!fromAdmin) {
        excluded = ['authorEmail', 'authorIp', 'authorUserAgent', 'commentStatus', 'userId', 'commentModified'];
      }
      const comments = await this.commentModel.findAll({
        attributes: {
          exclude: excluded
        },
        where,
        include: [{
          model: PostModel,
          attributes: ['postId', 'postGuid', 'postTitle']
        }, {
          model: CommentMetaModel,
          attributes: ['commentId', 'metaKey', 'metaValue']
        }],
        order: orders || [['commentCreated', 'desc']],
        subQuery: false,
        ...limitOpt
      });

      return {
        comments, page, total
      };
    } catch (e) {
      this.logger.error({
        message: e.message || '评论查询失败',
        data: param,
        stack: e.stack
      });
      throw new DbQueryErrorException();
    }
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
    }).then(() => true)
      .catch((e) => {
        this.logger.error({
          message: e.message || '评论修改失败',
          data: { commentIds, status },
          stack: e.stack
        });
        throw new DbQueryErrorException(Message.COMMENT_AUDIT_ERROR);
      });
  }

  async checkCommentExist(commentId: string): Promise<boolean> {
    return this.commentModel.count({
      where: {
        commentId: {
          [Op.eq]: commentId
        }
      }
    }).then((total) => total > 0).catch((e) => {
      this.logger.error({
        message: e.message || '评论是否存在查询失败',
        data: { commentId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async countComments(): Promise<number> {
    return this.commentModel.count({
      where: {
        commentStatus: [CommentStatus.NORMAL, CommentStatus.PENDING, CommentStatus.REJECT, CommentStatus.SPAM]
      }
    }).catch((e) => {
      this.logger.error({
        message: e.message || '评论总数查询失败',
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getRecentComments(limit?: number): Promise<CommentModel[]> {
    // todo: replace with getComments
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
    }).catch((e) => {
      this.logger.error({
        message: e.message || '最新评论查询失败',
        data: { limit },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async sendNotice(param: { commentId: string, parentId: string, isNew: boolean, post: PostModel, fromAdmin: boolean }) {
    const { commentId, parentId, isNew, post, fromAdmin } = param;
    const options = await this.optionService.getOptionByKeys(['admin_email', 'site_url']);
    if (!options['admin_email'] || !options['site_url']) {
      throw new InternalServerErrorException(
        format(Message.OPTION_VALUE_MISSED, ['admin_email', 'site_url'].filter((item) => !options[item]).join(',')),
        ResponseCode.OPTIONS_MISSED
      );
    }
    if (isNew && !fromAdmin) {
      await this.emailService.sendEmail({
        to: options['admin_email'],
        subject: '您有一条新评论',
        ...await this.getEmailContent({
          commentId, post, options, type: 'new'
        })
      });
    }
    if (parentId) {
      const parentComment = await this.getCommentById(parentId);
      await this.emailService.sendEmail({
        to: parentComment.authorEmail,
        subject: '您的评论有新的回复',
        ...await this.getEmailContent({
          commentId, post, options, type: 'reply'
        })
      });
    }
  }

  private async getEmailContent(
    param: { commentId: string, post: PostModel, options: OptionEntity, type: 'new' | 'reply' }
  ) {
    const { commentId, post, options, type } = param;
    const comment = await this.getCommentById(commentId);
    let texts: string[] = [];
    let postText = '';
    let postLink = '';
    if (type === 'reply') {
      postText = `您在《${post.postTitle}》上的评论有新的回复。`;
      postLink = `您在<a href="${options['site_url']}${post.postGuid}" target="_blank">《${post.postTitle}》</a>上的评论有新的回复。`;
      texts = [
        `回复者：${comment.authorName}`,
        `回复内容：${comment.commentContent}`
      ];
    } else {
      postText = `评论文章: ${post.postTitle}`;
      postLink = `评论文章: <a href="${options['site_url']}${post.postGuid}" target="_blank">${post.postTitle}</a>`;
      texts = [
        `评论时间: ${moment(comment.commentCreated).format('YYYY-MM-DD HH:mm:ss')}`,
        `评论者: ${comment.authorName}`,
        `评论内容: ${comment.commentContent}`,
        `评论状态: ${comment.commentStatus}`
      ];
    }
    const html = [postLink].concat(texts).map((text) => `<p>${text}</p>`).join('');
    texts.unshift(postText);
    const detailLink = `<a href="${options['site_url']}${post.postGuid}" target="_blank">立即回复 ${comment.authorName}</a>`;

    return {
      text: texts.join('\n'),
      html: [html, '<br/>', detailLink].join('\n')
    };
  }
}
