import { IsEmail, IsNotEmpty } from 'class-validator';
import { IsId } from '../validators/is-id.validator';

export default class CommentDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsId({ message: '评论不存在' })
  commentId: string;

  @IsId({ message: '评论文章不存在' })
  @IsNotEmpty({ message: '评论文章不存在' })
  postId: string;

  @IsId({ message: '回复的评论不存在' })
  parentId: string;

  @IsNotEmpty({ message: '昵称不能为空' })
  commentAuthor: string;

  @IsEmail({ allow_display_name: false }, { message: 'Email输入不正确' })
  @IsNotEmpty({ message: 'Email不能为空' })
  commentAuthorEmail: string;

  @IsNotEmpty({ message: '评论内容不能为空' })
  commentContent: string;

  captchaCode: string;

  commentStatus: string;
  commentIp: string;
  commentAgent: string;
  userId: string;
  commentCreatedGmt: Date;
  commentModifiedGmt: Date;
}
