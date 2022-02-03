import { SetMetadata } from '@nestjs/common';

export const IdParams = (
  idParams: {
    idInParams?: string[],
    idInQuery?: string[],
    idInBody?: string[]
  }) => SetMetadata('idParams', idParams);
