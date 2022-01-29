export interface UserVo {
  userId?: string;
  userMeta?: Record<string, string>;
  userLogin?: string;
  userNiceName: string;
  userEmail?: string;
  userStatus?: number;
}
