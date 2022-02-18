export interface AuthUserEntity {
  userName?: string;
  userEmail?: string;
  meta?: Record<string, string>;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}
