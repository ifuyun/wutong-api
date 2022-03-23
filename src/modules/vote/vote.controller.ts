import { Body, Controller, Header, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { VoteType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { Ip } from '../../decorators/ip.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { User } from '../../decorators/user.decorator';
import { VoteDto } from '../../dtos/vote.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { UserVo } from '../../interfaces/users.interface';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CommentsService } from '../comment/comments.service';
import { VotesService } from './votes.service';

@Controller()
export class VoteController {
  constructor(
    private readonly votesService: VotesService,
    private readonly commentsService: CommentsService
  ) {
  }

  @Post(['vote/save', 'api/votes'])
  @Header('Content-Type', 'application/json')
  async saveVote(
    @Req() req: Request,
    @Body(new TrimPipe()) voteDto: VoteDto,
    @User() user,
    @Ip() ip: string,
    @UserAgent() agent: string
  ) {
    user = user || {};
    voteDto = {
      objectId: voteDto.objectId,
      voteResult: voteDto.type === VoteType.LIKE ? 1 : -1,
      userId: user.userId || '',
      userIp: ip,
      userAgent: agent
    };
    const result = await this.votesService.saveVote(voteDto);
    if (!result) {
      throw new CustomException(Message.DB_QUERY_FAIL, HttpStatus.INTERNAL_SERVER_ERROR, ResponseCode.VOTE_FAILURE);
    }
    const comment = await this.commentsService.getCommentById(voteDto.objectId);

    return getSuccessResponse({
      vote: comment.commentVote
    });
  }
}
