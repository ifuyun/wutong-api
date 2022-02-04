import { SetMetadata } from '@nestjs/common';

const IdParams = (
  idParams: {
    idInParams?: string[],
    idInQuery?: string[],
    idInBody?: string[]
  }) => SetMetadata('idParams', idParams);

export default IdParams;
