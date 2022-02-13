import { UserModel } from '../models/user.model';

export interface UserVo extends UserModel {
  meta?: Record<string, string>;
}
