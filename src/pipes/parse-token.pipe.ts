import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { AuthService } from '../modules/auth/auth.service';
import { AuthUserEntity } from '../interfaces/auth.interface';
import { Role } from '../common/common.enum';

@Injectable()
export class ParseTokenPipe implements PipeTransform<string, Promise<AuthUserEntity>> {
  constructor(private authService: AuthService) {
  }

  async transform(token: string, metadata: ArgumentMetadata): Promise<AuthUserEntity> {
    const user = this.authService.parse(token);
    user.isAdmin = !!(user && user.meta && user.meta.roles === Role.ADMIN);

    return user;
  }
}
