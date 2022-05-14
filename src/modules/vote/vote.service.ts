import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { VoteType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { VoteDto } from '../../dtos/vote.dto';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { getUuid } from '../../helpers/helper';
import { CommentModel } from '../../models/comment.model';
import { PostMetaModel } from '../../models/post-meta.model';
import { VoteModel } from '../../models/vote.model';
import { LoggerService } from '../logger/logger.service';
import { VoteList, VoteQueryParam } from './vote.interface';

@Injectable()
export class VoteService {
  constructor(
    @InjectModel(VoteModel)
    private readonly voteModel: typeof VoteModel,
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel,
    @InjectModel(PostMetaModel)
    private readonly postMetaModel: typeof PostMetaModel,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  async saveVote(voteDto: VoteDto, type: VoteType): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      if (type === VoteType.COMMENT) {
        if (voteDto.voteResult > 0) {
          await this.commentModel.increment({ commentVote: 1 }, {
            where: {
              commentId: voteDto.objectId
            },
            transaction: t
          });
        } else {
          await this.commentModel.decrement({ commentVote: 1 }, {
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
        const metaId = postVote?.metaId || getUuid();
        await this.postMetaModel.upsert({
          metaId: metaId,
          postId: voteDto.objectId,
          metaKey: 'post_vote',
          metaValue: voteCount,
        }, { transaction: t });
      }

      voteDto.voteId = getUuid();
      await this.voteModel.create({ ...voteDto }, { transaction: t });
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
    const where = {
    };
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
}
