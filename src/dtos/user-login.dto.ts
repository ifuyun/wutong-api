import { IsNotEmpty, MaxLength } from 'class-validator';

export class UserLoginDto {
  @IsNotEmpty({ message: '请输入用户名' })
  @MaxLength(20, { message: '用户名长度不能超过$constraint1' })
  username: string;

  @IsNotEmpty({ message: '请输入密码' })
  @MaxLength(32, { message: '密码长度不能超过$constraint1' })
  password: string;

  rememberMe: string | number;
}
