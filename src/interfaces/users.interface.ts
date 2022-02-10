export interface UserVo {
  userId?: string;
  userLogin?: string;
  userNiceName: string;
  userEmail?: string;
  userStatus?: number;
  userMeta?: Record<string, string>;
}
