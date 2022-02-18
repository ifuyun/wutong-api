import { IsNotEmpty, MaxLength } from 'class-validator';

export class UserLoginDto {
  @MaxLength(20, { message: '用户名长度不能超过$constraint1' })
  @IsNotEmpty({ message: '请输入用户名' })
  username: string;

  /* 密码为加密后的，因此服务层不限制长度(固定为32位)，而在应用层限制 */
  @IsNotEmpty({ message: '请输入密码' })
  password: string;

  rememberMe?: string | number;
}
