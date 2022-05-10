import { Body, Controller, Header, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { VoteType, VoteValue } from '../../common/common.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IP } from '../../decorators/ip.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { VoteDto } from '../../dtos/vote.dto';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CommentService } from '../comment/comment.service';
import { PostMetaService } from '../post/post-meta.service';
import { VoteService } from './vote.service';

@Controller('api/votes')
export class VoteController {
  constructor(
    private readonly voteService: VoteService,
    private readonly commentService: CommentService,
    private readonly postMetaService: PostMetaService
  ) {
  }

  @Post()
  @Header('Content-Type', 'application/json')
  async saveVote(
    @Req() req: Request,
    @Body(new TrimPipe()) voteDto: VoteDto,
    @AuthUser() user,
    @IP() ip: string,
    @UserAgent() agent: string
  ) {
    user = user || {};
    const voteData: VoteDto = {
      objectId: voteDto.objectId,
      voteResult: voteDto.value === VoteValue.LIKE ? 1 : -1,
      userId: user.userId || '',
      userIp: ip,
      userAgent: agent
    };
    await this.voteService.saveVote(voteData, voteDto.type);
    let voteCount = 0;
    if (voteDto.type === VoteType.COMMENT) {
      voteCount = (await this.commentService.getCommentById(voteData.objectId)).commentVote;
    } else {
      const postVote = await this.postMetaService.getPostMetaByPostId(voteData.objectId, 'post_vote');
      voteCount = Number(postVote[0]?.metaValue) || 0;
    }

    return getSuccessResponse({
      vote: voteCount
    });
  }
}
