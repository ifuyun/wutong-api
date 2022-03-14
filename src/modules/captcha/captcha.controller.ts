import { Controller, Get, Header, Res, Session } from '@nestjs/common';
import { Response } from 'express';
import { CaptchaService } from './captcha.service';

@Controller()
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService
  ) {
  }

  @Get(['captcha', 'api/captcha'])
  @Header('Content-Type', 'image/svg+xml')
  async getSvgCaptcha(@Res() res: Response, @Session() session: any) {
    const captcha = await this.captchaService.getCaptcha();
    session.captcha = captcha.text;

    res.send(captcha.data);
  }
}
