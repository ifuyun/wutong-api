import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { format } from '../../helpers/helper';
import { LoggerService } from '../logger/logger.service';
import { OptionEntity } from '../option/option.interface';
import { OptionService } from '../option/option.service';
import { EmailOptions } from './email.interface';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private emailOptions: OptionEntity = {};

  constructor(
    private readonly configService: ConfigService,
    private readonly optionService: OptionService,
    private readonly logger: LoggerService
  ) {
  }

  public async sendEmail(emailOptions: EmailOptions, prefix: string | boolean = true): Promise<boolean> {
    if (this.configService.get('env.isDev')) { // ignore in development
      return true;
    }
    if (typeof prefix === 'boolean' && prefix) { // default prefix
      prefix = this.configService.get('app.emailSubjectPrefix');
    }
    if (prefix) {
      emailOptions.subject = prefix + emailOptions.subject;
    }
    await this.init();
    try {
      const info = await this.transporter.sendMail({
        ...emailOptions,
        from: `"${this.emailOptions['admin_name']}" <${this.emailOptions['mailserver_login']}>`
      });
      this.logger.info({
        message: `Email send succeed`,
        data: { messageId: info.messageId, response: info.response }
      });
      return true;
    } catch (e) {
      this.logger.error({
        message: `Email send failed with the reason: ${e.message || 'unknown error'}`,
        stack: e.stack || ''
      });
      return false;
    }
  }

  private async init() {
    const keys = ['admin_name', 'mailserver_url', 'mailserver_port', 'mailserver_login', 'mailserver_pass'];
    const options = await this.optionService.getOptionByKeys(keys);
    const nullKeys = keys.filter((key) => !options[key]);
    if (nullKeys.length > 0) {
      throw new InternalServerErrorException(
        format(Message.OPTION_VALUE_MISSED, nullKeys.join(',')), ResponseCode.OPTIONS_MISSED
      );
    }
    this.emailOptions = options;
    this.initEmailOptions();
  }

  private initEmailOptions() {
    this.transporter = createTransport({
      host: this.emailOptions['mailserver_url'],
      port: Number(this.emailOptions['mailserver_port']),
      secure: false,
      auth: {
        user: this.emailOptions['mailserver_login'],
        pass: this.emailOptions['mailserver_pass']
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });
  }
}
