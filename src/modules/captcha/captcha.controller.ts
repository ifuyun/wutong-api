import { Controller, Get, Header, Res, Session } from '@nestjs/common';
import { CaptchaService } from './captcha.service';

@Controller('captcha')
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService
  ) {
  }

  @Get()
  @Header('Content-Type', 'image/svg+xml')
  async getSvgCaptcha(@Res() res, @Session() session) {
    const captcha = await this.captchaService.getCaptcha();
    session.captcha = captcha.text;

    res.send(captcha.data);
  }
}
