import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as moment from 'moment';
import { FindOptions, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { VoteType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { VoteDto } from '../../dtos/vote.dto';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { format, generateId } from '../../helpers/helper';
import { CommentModel } from '../../models/comment.model';
import { PostMetaModel } from '../../models/post-meta.model';
import { PostModel } from '../../models/post.model';
import { VoteMetaModel } from '../../models/vote-meta.model';
import { VoteModel } from '../../models/vote.model';
import { EmailService } from '../common/email.service';
import { IPLocation } from '../common/ip.interface';
import { LoggerService } from '../logger/logger.service';
import { OptionEntity } from '../option/option.interface';
import { OptionService } from '../option/option.service';
import { PostService } from '../post/post.service';
import { VoteList, VoteQueryParam } from './vote.interface';

@Injectable()
export class VoteService {
  constructor(
    @InjectModel(VoteModel)
    private readonly voteModel: typeof VoteModel,
    @InjectModel(VoteMetaModel)
    private readonly voteMetaModel: typeof VoteMetaModel,
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel,
    @InjectModel(PostMetaModel)
    private readonly postMetaModel: typeof PostMetaModel,
    private readonly postService: PostService,
    private readonly optionService: OptionService,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
  }

  async saveVote(voteDto: VoteDto, type: VoteType, userLocation: IPLocation | null): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      if (type === VoteType.COMMENT) {
        if (voteDto.voteResult > 0) {
          await this.commentModel.increment({ commentLikes: 1 }, {
            where: {
              commentId: voteDto.objectId
            },
            transaction: t
          });
        } else {
          await this.commentModel.increment({ commentDislikes: 1 }, {
            where: {
              commentId: voteDto.objectId
            },
            transaction: t
          });
        }
      } else {
        const postVote = await this.postMetaModel.findOne({
          where: {
            postId: voteDto.objectId,
            metaKey: 'post_vote'
          }
        });
        let voteCount = Number(postVote?.metaValue) || 0;
        voteCount = voteDto.voteResult > 0 ? voteCount + 1 : voteCount - 1;
        const metaId = postVote?.metaId || generateId();
        await this.postMetaModel.upsert({
          metaId: metaId,
          postId: voteDto.objectId,
          metaKey: 'post_vote',
          metaValue: voteCount
        }, { transaction: t });
      }

      await this.voteModel.create({ ...voteDto }, { transaction: t });
      if (voteDto.user && !voteDto.userId) {
        await this.voteMetaModel.create({
          metaId: generateId(),
          voteId: voteDto.voteId,
          metaKey: 'user_info',
          metaValue: JSON.stringify(voteDto.user)
        }, { transaction: t });
      }
      if (userLocation) {
        await this.voteMetaModel.create({
          metaId: generateId(),
          voteId: voteDto.voteId,
          metaKey: 'user_location',
          metaValue: JSON.stringify(userLocation)
        }, { transaction: t });
      }
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '投票失败',
        data: voteDto,
        stack: e.stack
      });
      throw new DbQueryErrorException(Message.DB_QUERY_ERROR, ResponseCode.VOTE_FAILURE);
    });
  }

  async getVotes(param: VoteQueryParam): Promise<VoteList> {
    const { type, ip, keyword, orders } = param;
    const pageSize = param.pageSize || 10;
    const where = {};
    if (type) {
      where['objectType'] = type;
    }
    if (ip) {
      where['userIp'] = ip;
    }
    if (keyword) {
      where[Op.or] = [{
        userIp: {
          [Op.like]: `%${keyword}%`
        }
      }, {
        userAgent: {
          [Op.like]: `%${keyword}%`
        }
      }];
    }
    const queryOpt: FindOptions = {
      where,
      order: orders || [['voteCreated', 'desc']],
      subQuery: false
    };
    try {
      let total: number;
      let page: number;
      if (pageSize !== 0) {
        total = await this.voteModel.count({ where });
        page = Math.max(Math.min(param.page, Math.ceil(total / pageSize)), 1);
        queryOpt.limit = pageSize;
        queryOpt.offset = pageSize * (page - 1);
      }
      const votes = await this.voteModel.findAll(queryOpt);

      return {
        votes, page, total
      };
    } catch (e) {
      this.logger.error({
        message: e.message || '投票查询失败',
        data: param,
        stack: e.stack
      });
      throw new DbQueryErrorException();
    }
  }

  async sendNotice(voteData: VoteDto, userLocation: IPLocation | null, comment?: CommentModel) {
    const options = await this.optionService.getOptionByKeys(['admin_email', 'site_url']);
    if (!options['admin_email'] || !options['site_url']) {
      throw new InternalServerErrorException(
        format(Message.OPTION_VALUE_MISSED, ['admin_email', 'site_url'].filter((item) => !options[item]).join(',')),
        ResponseCode.OPTIONS_MISSED
      );
    }
    if (voteData.objectType === VoteType.POST) {
      const post = await this.postService.getPostById(voteData.objectId);
      await this.emailService.sendEmail({
        to: options['admin_email'],
        subject: `文章《${post.postTitle}》有新的点赞`,
        ...await this.getEmailContent({
          voteData, post, comment, options, userLocation
        })
      });
    } else {
      const post = await this.postService.getPostById(comment.postId);
      const content = await this.getEmailContent({
        voteData, post, comment, options, userLocation
      });
      await this.emailService.sendEmail({
        to: options['admin_email'],
        subject: `文章《${post.postTitle}》的评论有新的投票`,
        ...content
      });
      await this.emailService.sendEmail({
        to: comment.authorEmail,
        subject: `您在文章《${post.postTitle}》上的评论有新的投票`,
        ...content
      });
    }
  }

  getEmailContent(param: {
    voteData: VoteDto,
    post: PostModel,
    comment: CommentModel,
    options: OptionEntity,
    userLocation: IPLocation | null
  }) {
    const { voteData, post, comment, options, userLocation } = param;
    let texts: string[] = [];
    if (voteData.objectType === VoteType.COMMENT) {
      texts.push(`评论: ${comment.commentContent}`);
    }
    let from = userLocation ? [userLocation.country, userLocation.region, userLocation.city].join(' · ') : '未知地区';
    if (voteData.user && voteData.user.name) {
      from += ` 的 ${voteData.user.name}`;
    }
    texts = texts.concat([
      `投票: ${voteData.voteResult > 0 ? '+1' : '-1'}`,
      `投票时间: ${moment(voteData.voteCreated).format('YYYY-MM-DD HH:mm:ss')}`,
      `来自: ${from}`
    ]);

    const postLink = `<a href="${options['site_url']}${post.postGuid}" target="_blank">${post.postTitle}</a>`;
    const html = [`文章: ${postLink}`].concat(texts).map((text) => `<p>${text}</p>`).join('');
    texts.unshift(`文章: ${post.postTitle}`);
    const detailLink = `<a href="${options['site_url']}${post.postGuid}" target="_blank">点击查看</a>`;

    return {
      text: texts.join('\n'),
      html: [html, '<br/>', detailLink].join('\n')
    };
  }
}
