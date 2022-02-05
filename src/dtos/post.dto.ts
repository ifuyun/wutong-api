import { IsNotEmpty } from 'class-validator';
import { IsId } from '../validators/is-id.validator';

export default class PostDto {
  // 验证顺序根据注解声明顺序从下往上
  @IsId({ message: '文章不存在' })
  postId?: string;

  @IsNotEmpty({ message: '文章标题不能为空' })
  postTitle: string;

  @IsNotEmpty({ message: '文章内容不能为空' })
  postContent: string;

  @IsNotEmpty({ message: '发布时间不能为空' })
  postDate: Date;

  @IsNotEmpty({ message: '请选择文章来源' })
  postOriginal: number;

  postExcerpt?: string;
  postAuthor?: string;
  postStatus?: string;
  postType?: string;
  postGuid?: string;
}
