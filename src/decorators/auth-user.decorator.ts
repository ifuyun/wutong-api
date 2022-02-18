import { AuthToken } from './auth-token.decorator';
import { ParseTokenPipe } from '../pipes/parse-token.pipe';

// note: if need, can add additional param: additionalOptions
export const AuthUser = () => AuthToken(ParseTokenPipe);
