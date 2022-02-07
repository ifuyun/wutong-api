import { IsNotEmpty } from 'class-validator';
import { IsId } from '../validators/is-id.validator';
import { IsIncludedIn } from '../validators/is-included-in.validator';
import { VoteType } from '../common/common.enum';

export default class VoteDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsId({ message: '投票不存在' })
  voteId: string;

  @IsId({ message: '投票对象不存在' })
  @IsNotEmpty({ message: '投票对象不存在' })
  objectId: string;

  @IsIncludedIn(
    { ranges: [VoteType.LIKE, VoteType.DISLIKE] },
    { message: '参数错误' }
  )
  @IsNotEmpty({ message: '参数错误' })
  type: string;

  voteResult: number;

  voteCreated: Date;

  userId: string;

  userIp: string;

  userAgent: string;
}
