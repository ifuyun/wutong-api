import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export default class InitInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    /* 拦截器内不能调用req.session.save()，否则会导致session无法注销 */
    const req = context.switchToHttp().getRequest();
    const user = req.session.user;
    const isLogin = !!user;
    // todo: 全局变量在通过res.render显式调用时无法获取，因此仍需要通过res.locals方式设置
    const res = context.switchToHttp().getResponse();
    res.locals.isLogin = isLogin;
    // for copyright
    res.locals.curYear = new Date().getFullYear();
    res.locals.enableWxSdk = this.configService.get('app.enableWxSdk');

    // Warning: pipe、map等操作将对res.render方式无效
    return next.handle();
  }
}
