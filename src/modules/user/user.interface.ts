import { UserModel } from '../../models/user.model';

export interface UserVo extends UserModel {
  meta?: Record<string, string>;
}

export interface Guest {
  name: string;
  email: string;
}
