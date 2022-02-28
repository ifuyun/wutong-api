import { Body, Controller, Header, HttpStatus, Post, Req } from '@nestjs/common';
import { Message } from '../../common/message.enum';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { VotesService } from './votes.service';
import { CommentsService } from '../comment/comments.service';
import { VoteType } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { VoteDto } from '../../dtos/vote.dto';
import { Ip } from '../../decorators/ip.decorator';
import { User } from '../../decorators/user.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { CustomException } from '../../exceptions/custom.exception';
import { TrimPipe } from '../../pipes/trim.pipe';

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
    @Req() req,
    @Body(new TrimPipe()) voteDto: VoteDto,
    @User() user,
    @Ip() ip,
    @UserAgent() agent
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
      throw new CustomException(Message.DB_QUERY_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, ResponseCode.VOTE_FAILURE);
    }
    const comment = await this.commentsService.getCommentById(voteDto.objectId);

    return getSuccessResponse({
      vote: comment.commentVote
    });
  }
}
