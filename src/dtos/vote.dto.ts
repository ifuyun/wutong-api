import { IntersectionType } from '@nestjs/mapped-types';
import { IsNotEmpty } from 'class-validator';
import { VoteType, VoteValue } from '../common/common.enum';
import { Message } from '../common/message.enum';
import { format } from '../helpers/helper';
import { IPLocation } from '../modules/common/ip.interface';
import { Guest } from '../modules/user/user.interface';
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
    { ranges: [VoteValue.LIKE, VoteValue.DISLIKE] },
    { message: format(Message.PARAM_INVALID, '$constraint1') }
  )
  @IsNotEmpty({ message: Message.UNSUPPORTED_OPERATION })
  value?: VoteValue;

  @IsIncludedIn(
    { ranges: [VoteType.POST, VoteType.COMMENT] },
    { message: format(Message.PARAM_INVALID, '$constraint1') }
  )
  @IsNotEmpty({ message: Message.UNSUPPORTED_OPERATION })
  type?: VoteType;
}

export class AdditionalVoteDto {
  objectType: VoteType;
  voteResult: number;
  user: Guest | null;
  userId: string;
  userIp: string;
  userAgent: string;
  voteCreated?: Date;
}

export class VoteDto extends IntersectionType(BasicVoteDto, AdditionalVoteDto) {
}
