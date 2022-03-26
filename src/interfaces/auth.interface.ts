export interface AuthUserEntity {
  userId?: string;
  userName?: string;
  userEmail?: string;
  meta?: Record<string, string>;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}
