import { SetMetadata } from '@nestjs/common';

export const IdParams = (idInParams: string[], idInQuery: string[] = []) =>
  SetMetadata('idParams', [idInParams, idInQuery]);
