import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { AuthUserEntity } from '../modules/auth/auth.interface';

@Injectable()
export class IsAdminPipe implements PipeTransform {
  transform(user: AuthUserEntity, metadata: ArgumentMetadata) {
    return user.isAdmin || false;
  }
}
