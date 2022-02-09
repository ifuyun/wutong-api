import { IsNotEmpty, MaxLength } from 'class-validator';

export class UserLoginDto {
  @MaxLength(20, { message: '用户名长度不能超过$constraint1' })
  @IsNotEmpty({ message: '请输入用户名' })
  username: string;

  @MaxLength(32, { message: '密码长度不能超过$constraint1' })
  @IsNotEmpty({ message: '请输入密码' })
  password: string;

  rememberMe: string | number;
}
