import { Body, Controller, Get, Header, HttpStatus, Post, Req, Res, Session } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UtilService } from '../util/util.service';
import { OptionsService } from '../option/options.service';
import { ResponseCode } from '../../common/response-code.enum';
import { Referer } from '../../decorators/referer.decorator';
import { UserLoginDto } from '../../dtos/user-login.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { getMd5 } from '../../helpers/helper';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { AuthService } from '../auth/auth.service';

@Controller('')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly optionsService: OptionsService,
    private readonly utilService: UtilService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
  }

  @Post('api/login')
  @Header('Content-Type', 'application/json')
  async doLogin(@Req() req, @Body() loginDto: UserLoginDto) {
    const result = await this.authService.login(loginDto);
    if (result && result.accessToken) {
      req.session.auth = {
        token: result.accessToken,
        expiresAt: result.expiresAt
      };
    }
    return getSuccessResponse(result);
  }

  @Get('user/login')
  async showLogin(
    @Req() req,
    @Res() res,
    @Session() session,
    @Referer() referer
  ) {
    if (session.user && req.cookies.rememberMe === '1') {
      return res.redirect(referer || '/');
    }
    session.loginReferer = referer;
    const options = await this.optionsService.getOptions();

    // @Render注解无法和@Redirect共存，否则将报错；但res.render和@Render并不相同
    res.render('home/pages/login', {
      // token: req.csrfToken(),
      options,
      meta: {
        title: this.utilService.getTitle(['用户登录']),
        description: '用户登录',
        keywords: options.site_keywords,
        author: options.site_author
      }
    });
  }

  @Post('user/login')
  @Header('Content-Type', 'application/json')
  async login(
    @Req() req,
    @Res({ passthrough: true }) res,
    @Session() session,
    @Body() loginDto: UserLoginDto
  ) {
    const user = await this.usersService.getUserByName(loginDto.username);
    const password = user && getMd5(`${user.userPassSalt}${loginDto.password}`) || '';
    if (!user || password !== user.userPass) {
      throw new CustomException({
        status: HttpStatus.BAD_REQUEST,
        data: {
          code: ResponseCode.LOGIN_REJECT,
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
    if (loginDto.rememberMe === '1') {
      req.session.cookie.expires = new Date(Date.now() + expires);
      req.session.cookie.maxAge = expires;
    } else {
      req.session.cookie.expires = false;
    }
    req.session.user = user;
    req.session.save();

    return getSuccessResponse({
      url: referer || '/'
    });
  }

  @Get('user/logout')
  async logout(
    @Req() req,
    @Res() res,
    @Referer() referer
  ) {
    /**
     * req.session和@Session()并不相同，
     * req.session.destroy后，req.session为空，但@Session()仍能取到值
     */
    req.session.destroy((err) => {
      if (err) {
        throw new CustomException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          data: {
            code: ResponseCode.SESSION_DESTROY_ERROR,
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
