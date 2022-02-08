import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { VoteDto } from '../dtos/vote.dto';
import { getUuid } from '../helpers/helper';
import LoggerService from './logger.service';
import CommentModel from '../models/comment.model';
import VoteModel from '../models/vote.model';

@Injectable()
export default class VotesService {
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
      voteDto.voteId = getUuid();
      await this.voteModel.create({ ...voteDto }, { transaction: t });
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '投票保存失败。',
        data: voteDto,
        stack: err.stack
      });
      return Promise.resolve(false);
    });
  }
}
