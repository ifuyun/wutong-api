import { IntersectionType } from '@nestjs/mapped-types';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { IsCommentExist } from '../validators/is-comment-exist.validator';
import { IsId } from '../validators/is-id.validator';
import { IsPostExist } from '../validators/async/is-post-exist.validator';

export class BasicCommentDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsCommentExist({ message: '修改的评论不存在' })
  @IsId({ message: '参数非法' })
  commentId?: string;

  @IsPostExist({ message: '评论文章不存在' })
  @IsId({ message: '参数非法' })
  @IsNotEmpty({ message: '评论文章不存在' })
  postId: string;

  @IsCommentExist({ message: '回复的评论不存在' })
  @IsId({ message: '参数非法' })
  parentId?: string;

  @IsNotEmpty({ message: '昵称不能为空' })
  commentAuthor?: string;

  @IsEmail({ allow_display_name: false }, { message: 'Email输入不正确' })
  @IsNotEmpty({ message: 'Email不能为空' })
  commentAuthorEmail?: string;

  @IsNotEmpty({ message: '评论内容不能为空' })
  commentContent: string;
}

export class AdditionalCommentDto {
  captchaCode?: string;
  commentStatus?: string;
  commentIp?: string;
  commentAgent?: string;
  userId?: string;
}

export class CommentDto extends IntersectionType(BasicCommentDto, AdditionalCommentDto) {
}
