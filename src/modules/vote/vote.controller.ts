import { Body, Controller, Header, HttpStatus, Post, Req } from '@nestjs/common';
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

@Controller('vote')
export class VoteController {
  constructor(
    private readonly votesService: VotesService,
    private readonly commentsService: CommentsService
  ) {
  }

  @Post('save')
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
      throw new CustomException('请求失败，请刷新页面重试。', HttpStatus.OK, ResponseCode.VOTE_FAILURE);
    }
    const comment = await this.commentsService.getCommentById(voteDto.objectId);

    return {
      status: HttpStatus.OK,
      code: ResponseCode.SUCCESS,
      token: req.csrfToken(),
      data: {
        commentVote: comment.commentVote
      }
    };
  }
}
