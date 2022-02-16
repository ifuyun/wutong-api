import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../user/users.service';
import { ResponseCode } from '../../common/response-code.enum';
import { UserLoginDto } from '../../dtos/user-login.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { getMd5 } from '../../helpers/helper';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) {
  }

  async login(loginDto: UserLoginDto) {
    const user = await this.usersService.getUserByName(loginDto.username);
    if (user) {
      const password = getMd5(`${user.userPassSalt}${loginDto.password}`);
      if (password === user.userPass) {
        return {
          access_token: this.jwtService.sign({
            userName: user.userNiceName,
            userEmail: user.userEmail,
            meta: user.meta
          })
        };
      }
    }
    throw new CustomException('Unauthorized', HttpStatus.UNAUTHORIZED, ResponseCode.UNAUTHORIZED);
  }
}
