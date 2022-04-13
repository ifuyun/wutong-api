import { IntersectionType } from '@nestjs/mapped-types';
import { IsNotEmpty } from 'class-validator';
import { VoteType } from '../common/common.enum';
import { Message } from '../common/message.enum';
import { format } from '../helpers/helper';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';

export class BasicVoteDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  voteId?: string;

  @IsId({ message: format(Message.PARAM_INVALID, '$constraint1') })
  @IsNotEmpty({ message: '投票对象不存在' })
  objectId: string;

  @IsIncludedIn(
    { ranges: [VoteType.LIKE, VoteType.DISLIKE] },
    { message: format(Message.PARAM_INVALID, '$constraint1') }
  )
  @IsNotEmpty({ message: Message.UNSUPPORTED_OPERATION })
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
