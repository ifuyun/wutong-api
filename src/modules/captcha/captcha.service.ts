import { Injectable } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';

@Injectable()
export class CaptchaService {
  async getCaptcha(size: number = 4) {
    return svgCaptcha.create({
      size,
      fontSize: 36,
      width: 80,
      height: 32,
      background: '#ddd'
    });
  }
}
