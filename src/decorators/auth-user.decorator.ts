import { ParseTokenPipe } from '../pipes/parse-token.pipe';
import { AuthToken } from './auth-token.decorator';

// note: if needed, can add additional param: additionalOptions
export const AuthUser = () => AuthToken(ParseTokenPipe);
