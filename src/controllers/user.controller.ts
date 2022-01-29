import { Body, Controller, Get, Header, HttpStatus, Post, Req, Res, Session, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseCode } from '../common/enums';
import Referer from '../decorators/referer.decorator';
import UserLoginDto from '../dtos/user-login.dto';
import CustomException from '../exceptions/custom.exception';
import OptionsService from '../services/options.service';
import UsersService from '../services/users.service';
import UtilService from '../services/util.service';

@Controller('user')
export default class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly optionsService: OptionsService,
    private readonly utilService: UtilService,
    private readonly configService: ConfigService
  ) {
  }

  @Get('login')
  async showLogin(
    @Req() req,
    @Res() res,
    @Session() session,
    @Referer() referer
  ) {
    if (session.user) {
      return res.redirect(referer || '/');
    }
    session.loginReferer = referer;
    const options = await this.optionsService.getOptions();

    // @Render注解无法和@Redirect共存，否则将报错；但res.render和@Render并不相同
    res.render('home/pages/login', {
      token: req.csrfToken(),
      options,
      meta: {
        title: this.utilService.getTitle(['用户登录']),
        description: '用户登录',
        keywords: options.site_keywords.value,
        author: options.site_author.value
      }
    });
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Header('Content-Type', 'application/json')
  async login(
    @Req() req,
    @Res({ passthrough: true }) res,
    @Session() session,
    @Body() loginDto: UserLoginDto
  ) {
    const user = await this.usersService.login(loginDto);
    if (!user) {
      throw new CustomException({
        data: {
          code: ResponseCode.LOGIN_ERROR,
          status: HttpStatus.BAD_REQUEST,
          message: '用户名或密码错误'
        },
        log: {
          msg: `用户[${loginDto.username}]登录密码错误，登录失败。`
        }
      });
    }
    const referer = session.loginReferer;
    delete session.loginReferer;

    const domain = this.configService.get('app.cookieDomain');
    const expires = this.configService.get('app.cookieExpires');
    res.cookie('username', loginDto.username, {
      path: '/',
      domain,
      maxAge: expires
    });
    res.cookie('rememberMe', loginDto.rememberMe === '1' ? 1 : 0, {
      path: '/',
      domain,
      maxAge: expires
    });
    if (loginDto.rememberMe && loginDto.rememberMe === '1') {
      req.session.cookie.expires = new Date(Date.now() + expires);
      req.session.cookie.maxAge = expires;
    } else {
      req.session.cookie.expires = false;
    }
    req.session.user = user;
    req.session.save();

    return {
      status: HttpStatus.OK,
      code: ResponseCode.SUCCESS,
      message: null,
      data: {
        url: referer || '/'
      }
    };
  }

  @Get('logout')
  async logout(@Req() req, @Res() res, @Referer() referer) {
    req.session.destroy((err) => {
      if (err) {
        throw new CustomException({
          data: {
            code: ResponseCode.SESSION_DESTROY_ERROR,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: '登出失败，请重试。'
          },
          log: {
            msg: err.message,
            stack: err.stack
          }
        });
      }
      res.redirect(referer || '/');
    });
  }
}
