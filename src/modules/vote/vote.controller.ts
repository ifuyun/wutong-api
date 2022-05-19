import { Body, Controller, Get, Header, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { VoteType, VoteValue } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { IP } from '../../decorators/ip.decorator';
import { UserAgent } from '../../decorators/user-agent.decorator';
import { VoteDto } from '../../dtos/vote.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { format, getUuid } from '../../helpers/helper';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getQueryOrders } from '../../transformers/query-orders.transformers';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { CommentService } from '../comment/comment.service';
import { IpService } from '../common/ip.service';
import { PostMetaService } from '../post/post-meta.service';
import { PostService } from '../post/post.service';
import { VoteEntity, VoteQueryParam } from './vote.interface';
import { VoteService } from './vote.service';

@Controller('api/votes')
export class VoteController {
  constructor(
    private readonly voteService: VoteService,
    private readonly commentService: CommentService,
    private readonly postMetaService: PostMetaService,
    private readonly postService: PostService,
    private readonly ipService: IpService
  ) {
  }

  @Throttle(20, 60)
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
      voteId: getUuid(),
      objectId: voteDto.objectId,
      objectType: voteDto.type,
      voteResult: voteDto.value === VoteValue.LIKE ? 1 : -1,
      user: voteDto.user,
      userId: user.userId || '',
      userIp: ip,
      userLocation: await this.ipService.queryLocation(ip),
      userAgent: agent,
      voteCreated: new Date()
    };
    await this.voteService.saveVote(voteData, voteDto.type);
    let voteCount = 0;
    if (voteDto.type === VoteType.COMMENT) {
      const comment = await this.commentService.getCommentById(voteData.objectId);
      await this.voteService.sendNotice(voteData, comment);
      voteCount = comment.commentVote;
    } else {
      await this.voteService.sendNotice(voteData);
      const postVote = await this.postMetaService.getPostMetaByPostId(voteData.objectId, 'post_vote');
      voteCount = Number(postVote[0]?.metaValue) || 0;
    }

    return getSuccessResponse({
      vote: voteCount
    });
  }

  @Get()
  @Header('Content-Type', 'application/json')
  async getVotes(
    @Query('page', new ParseIntPipe(1)) page: number,
    @Query('pageSize', new ParseIntPipe(10)) pageSize: number,
    @Query('ip', new TrimPipe()) ip: string,
    @Query('type', new TrimPipe()) type: VoteType | VoteType[],
    @Query('keyword', new TrimPipe()) keyword: string,
    @Query('orders', new TrimPipe()) orders: string[]
  ) {
    const param: VoteQueryParam = {
      page,
      pageSize,
      ip,
      keyword
    };
    if (type) {
      type = typeof type === 'string' ? [type] : type;
      const allowed = Object.keys(VoteType).map((key) => VoteType[key]);
      type.forEach((v: VoteType) => {
        if (!allowed.includes(v)) {
          throw new BadRequestException(format(Message.PARAM_INVALID, 'type'));
        }
      });
      param.type = type;
    }
    param.orders = getQueryOrders({ voteCreated: 1 }, orders);
    const voteList = await this.voteService.getVotes(param);
    const postVotes = voteList.votes.filter((item) => item.objectType === VoteType.POST).map((item) => item.objectId);
    const commentVotes = voteList.votes.filter(
      (item) => item.objectType === VoteType.COMMENT).map((item) => item.objectId
    );
    const posts = await this.postService.getPostsByIds(postVotes);
    const comments = await this.commentService.getCommentsByIds(commentVotes);
    const votes: VoteEntity[] = [];
    voteList.votes.forEach((item) => {
      const vote = item.get();
      if (vote.objectType === VoteType.POST) {
        vote.post = posts.filter((post) => post.postId === vote.objectId)[0];
        vote.postMeta = {};
        vote.post.postMeta.forEach((meta) => {
          vote.postMeta[meta.metaKey] = meta.metaValue;
        });
      } else {
        vote.comment = comments.filter((comment) => comment.commentId === vote.objectId)[0];
      }
      votes.push(vote);
    });

    return getSuccessResponse({
      votes: votes,
      total: voteList.total,
      page: voteList.page
    });
  }
}
