import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../user/users.service';
import { UserLoginDto } from '../../dtos/user-login.dto';
import { UnauthorizedException } from '../../exceptions/unauthorized.exception';
import { getMd5 } from '../../helpers/helper';
import { CustomException } from '../../exceptions/custom.exception';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUserEntity } from '../../interfaces/auth.interface';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { Message } from '../../common/message.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService
  ) {
  }

  async login(loginDto: UserLoginDto) {
    const user = await this.usersService.getUserByName(loginDto.username);
    if (user) {
      const password = getMd5(`${user.userPassSalt}${loginDto.password}`);
      if (password === user.userPass) {
        return {
          accessToken: this.jwtService.sign({
            userName: user.userNiceName,
            userEmail: user.userEmail,
            meta: user.meta
          }),
          expiresIn: this.configService.get('auth.expiresIn')
        };
      }
      throw new BadRequestException(Message.LOGIN_REJECT, HttpStatus.BAD_REQUEST, ResponseCode.LOGIN_REJECT);
    }
    throw new BadRequestException(Message.LOGIN_REJECT, HttpStatus.BAD_REQUEST, ResponseCode.LOGIN_REJECT);
  }

  parse(token: string): AuthUserEntity {
    if (token) {
      token = token.split(' ')[1];
      try {
        const authData = this.jwtService.verify(token, {
          secret: this.configService.get('auth.secret')
        });
        return authData || {};
      }
      catch (e) {
        throw new CustomException('Token get error', HttpStatus.BAD_REQUEST, ResponseCode.BAD_REQUEST);
      }
    }
    return {};
  }
}
