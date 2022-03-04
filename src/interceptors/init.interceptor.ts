import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class InitInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    /* 拦截器内不能调用req.session.save()，否则会导致session无法注销 */
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Warning: pipe、map等操作将对res.render方式无效
    return next.handle();
  }
}
