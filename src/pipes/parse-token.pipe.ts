import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { AuthUserEntity } from '../interfaces/auth.interface';
import { AuthService } from '../modules/auth/auth.service';

@Injectable()
export class ParseTokenPipe implements PipeTransform<string, Promise<AuthUserEntity>> {
  constructor(private authService: AuthService) {
  }

  async transform(token: string, metadata: ArgumentMetadata): Promise<AuthUserEntity> {
    return this.authService.parse(token);
  }
}
