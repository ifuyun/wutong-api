export interface EmailOptions {
  from?: string;
  to: string;
  cc?: string;
  subject: string;
  html?: string;
  text?: string;
}
