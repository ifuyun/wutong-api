import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Message } from '../common/message.enum';
import { NotFoundException } from '../exceptions/not-found.exception';
import { CustomExceptionResponse } from '../exceptions/exception.interface';
import { AuthService } from '../modules/auth/auth.service';
import { LoggerService } from '../modules/logger/logger.service';
import { OptionService } from '../modules/option/option.service';
import { PostService } from '../modules/post/post.service';

@Injectable()
export class ServeFileMiddleware implements NestMiddleware {
  constructor(
    private readonly optionService: OptionService,
    private readonly postService: PostService,
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {
    logger.setLogger(logger.sysLogger);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const url = req.url;
    const token = req.headers.authorization;
    const user = this.authService.parse(token);
    const fileEntity = await this.postService.getPostByGuid(url, user.isAdmin);
    if (!fileEntity) {
      this.logger.error({
        message: `${url} is not exist or can not be accessed`,
      });
      return next(new NotFoundException(Message.FILE_NOT_FOUND));
    }
    const options = await this.optionService.getOptionByKeys(['upload_path', 'upload_url_prefix']);
    const fileOptions = {
      root: options['upload_path'],
      maxAge: '1y'
    };
    res.header('Cross-Origin-Resource-Policy', 'same-site');
    res.sendFile(url.substring(options['upload_url_prefix'].length), fileOptions, (err) => {
      if (err) {
        this.logger.error({
          message: err.message,
          data: {
            file: url
          },
          stack: err.stack
        });
        res.json((<CustomExceptionResponse>new NotFoundException(Message.FILE_NOT_FOUND).getResponse()).data);
      }
    });
  }
}
