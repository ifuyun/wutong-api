import { Body, Controller, Header, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { VoteType } from '../../common/common.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { Ip } from '../../decorators/ip.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { VoteDto } from '../../dtos/vote.dto';
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
    await this.voteService.saveVote(voteDto);
    const comment = await this.commentService.getCommentById(voteDto.objectId);

    return getSuccessResponse({
      vote: comment.commentVote
    });
  }
}
