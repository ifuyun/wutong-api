export interface AuthUserEntity {
  userName?: string;
  userEmail?: string;
  meta?: Record<string, string>;
  iat?: number;
  exp?: number;
}
