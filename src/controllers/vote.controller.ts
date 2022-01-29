import { Body, Controller, Header, HttpStatus, Post, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { ResponseCode, VoteType } from '../common/enums';
import VoteDto from '../dtos/vote.dto';
import Ip from '../decorators/ip.decorator';
import User from '../decorators/user.decorator';
import UserAgent from '../decorators/user-agent.decorator';
import CustomException from '../exceptions/custom.exception';
import TrimPipe from '../pipes/trim.pipe';
import CommentsService from '../services/comments.service';
import VotesService from '../services/votes.service';
import ExceptionFactory from '../validators/exception-factory';

@Controller('vote')
export default class VoteController {
  constructor(
    private readonly votesService: VotesService,
    private readonly commentsService: CommentsService
  ) {
  }

  @Post('save')
  @UsePipes(new ValidationPipe({
    transform: true,
    skipNullProperties: true,
    stopAtFirstError: true,
    exceptionFactory: ExceptionFactory
  }))
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
      ...voteDto,
      voteResult: voteDto.type === VoteType.LIKE ? 1 : -1,
      userIp: ip,
      userAgent: agent,
      userId: user.userId || ''
    };
    const result = await this.votesService.saveVote(voteDto);
    if (!result) {
      throw new CustomException(ResponseCode.VOTE_FAILURE, HttpStatus.OK, '请求失败，请刷新页面重试。');
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
