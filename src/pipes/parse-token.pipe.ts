import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { AuthService } from '../modules/auth/auth.service';
import { AuthUserEntity } from '../interfaces/auth.interface';

@Injectable()
export class ParseTokenPipe implements PipeTransform<string, any> {
  constructor(private authService: AuthService) {
  }

  async transform(token: string, metadata: ArgumentMetadata): Promise<AuthUserEntity> {
    return this.authService.parse(token);
  }
}
