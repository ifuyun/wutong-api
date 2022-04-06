import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { UserLoginDto } from '../../dtos/user-login.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { getMd5 } from '../../helpers/helper';
import { AuthUserEntity } from '../../interfaces/auth.interface';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService
  ) {
  }

  async login(loginDto: UserLoginDto) {
    const user = await this.userService.getUserByName(loginDto.username);
    if (user) {
      const password = getMd5(`${user.userPassSalt}${loginDto.password}`);
      if (password === user.userPass) {
        return {
          accessToken: this.jwtService.sign({
            userId: user.userId,
            userName: user.userNiceName,
            userEmail: user.userEmail,
            meta: user.meta
          }),
          expiresAt: Date.now() + this.configService.get('auth.expiresIn') * 1000 // from 's' to 'ms'
        };
      }
      throw new BadRequestException(Message.LOGIN_REJECT, ResponseCode.LOGIN_REJECT);
    }
    throw new BadRequestException(Message.LOGIN_REJECT, ResponseCode.LOGIN_REJECT);
  }

  parse(token: string): AuthUserEntity {
    let user: AuthUserEntity = {
      isAdmin: false
    };
    if (token) {
      token = token.split(' ')[1];
      try {
        user = this.jwtService.verify(token, {
          secret: this.configService.get('auth.secret')
        }) || {};
        user.isAdmin = !!(user && user.meta && user.meta.roles === Role.ADMIN);
        return user;
      }
      catch (e) {
        // eg: e.message: jwt expired
        return user;
      }
    }
    return user;
  }
}
