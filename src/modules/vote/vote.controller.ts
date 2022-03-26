import { Body, Controller, Header, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { VoteType } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { Ip } from '../../decorators/ip.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { VoteDto } from '../../dtos/vote.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CommentService } from '../comment/comment.service';
import { VoteService } from './vote.service';

@Controller('api/votes')
export class VoteController {
  constructor(
    private readonly voteService: VoteService,
    private readonly commentService: CommentService
  ) {
  }

  @Post()
  @Header('Content-Type', 'application/json')
  async saveVote(
    @Req() req: Request,
    @Body(new TrimPipe()) voteDto: VoteDto,
    @AuthUser() user,
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
    const result = await this.voteService.saveVote(voteDto);
    if (!result) {
      throw new CustomException(Message.DB_QUERY_FAIL, HttpStatus.INTERNAL_SERVER_ERROR, ResponseCode.VOTE_FAILURE);
    }
    const comment = await this.commentService.getCommentById(voteDto.objectId);

    return getSuccessResponse({
      vote: comment.commentVote
    });
  }
}
