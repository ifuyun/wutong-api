import { Controller, Get, Header, Res, Session } from '@nestjs/common';
import { CaptchaService } from './captcha.service';

@Controller()
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService
  ) {
  }

  @Get(['captcha', 'api/captcha'])
  @Header('Content-Type', 'image/svg+xml')
  async getSvgCaptcha(@Res() res, @Session() session) {
    const captcha = await this.captchaService.getCaptcha();
    session.captcha = captcha.text;

    res.send(captcha.data);
  }
}
