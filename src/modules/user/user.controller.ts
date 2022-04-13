import { Body, Controller, Get, Header, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { UserLoginDto } from '../../dtos/user-login.dto';
import { AuthUserEntity } from '../auth/auth.interface';
import { HttpResponseEntity } from '../../common/http-response.interface';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { AuthService } from '../auth/auth.service';
import { OptionService } from '../option/option.service';
import { UtilService } from '../util/util.service';
import { UserService } from './user.service';

@Controller('api/users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly optionService: OptionService,
    private readonly utilService: UtilService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
  }

  @Post('login')
  @Header('Content-Type', 'application/json')
  async login(@Body() loginDto: UserLoginDto) {
    const result = await this.authService.login(loginDto);
    return getSuccessResponse(result);
  }

  @Get('login-user')
  @Header('Content-Type', 'application/json')
  async getLoginUser(@AuthUser() user: AuthUserEntity): Promise<HttpResponseEntity> {
    return getSuccessResponse(user);
  }
}
