import { IsAdminPipe } from '../pipes/is-admin.pipe';
import { ParseTokenPipe } from '../pipes/parse-token.pipe';
import { AuthToken } from './auth-token.decorator';

export const IsAdmin = () => AuthToken(ParseTokenPipe, IsAdminPipe);
