import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { VoteDto } from '../../dtos/vote.dto';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { getUuid } from '../../helpers/helper';
import { CommentModel } from '../../models/comment.model';
import { VoteModel } from '../../models/vote.model';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class VoteService {
  constructor(
    @InjectModel(VoteModel)
    private readonly voteModel: typeof VoteModel,
    @InjectModel(CommentModel)
    private readonly commentModel: typeof CommentModel,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  async saveVote(voteDto: VoteDto): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      if (voteDto.voteResult && voteDto.voteResult > 0) {
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
}
