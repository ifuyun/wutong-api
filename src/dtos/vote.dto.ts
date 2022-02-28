import { IntersectionType } from '@nestjs/mapped-types';
import { IsNotEmpty } from 'class-validator';
import { VoteType } from '../common/common.enum';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';

export class BasicVoteDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsId({ message: '参数非法' })
  voteId?: string;

  @IsId({ message: '参数非法' })
  @IsNotEmpty({ message: '投票对象不存在' })
  objectId: string;

  @IsIncludedIn(
    { ranges: [VoteType.LIKE, VoteType.DISLIKE] },
    { message: '参数错误' }
  )
  @IsNotEmpty({ message: '参数错误' })
  type?: string;
}

export class AdditionalVoteDto {
  voteResult?: number;
  userId: string;
  userIp: string;
  userAgent: string;
  voteCreated?: Date;
}

export class VoteDto extends IntersectionType(BasicVoteDto, AdditionalVoteDto) {
}
