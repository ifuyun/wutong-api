import { AuthToken } from './auth-token.decorator';
import { ParseTokenPipe } from '../pipes/parse-token.pipe';

export const AuthUser = () => AuthToken(ParseTokenPipe);
