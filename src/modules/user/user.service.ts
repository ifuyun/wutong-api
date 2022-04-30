import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { LoggerService } from '../logger/logger.service';
import { UserVo } from './user.interface';
import { UserMetaModel } from '../../models/user-meta.model';
import { UserModel } from '../../models/user.model';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(UserModel)
    private readonly userModel: typeof UserModel,
    private readonly logger: LoggerService,
  ) {
  }

  async getUserByName(username: string): Promise<UserVo> {
    return this.userModel.findOne({
      attributes: [
        'userId', 'userLogin', 'userPass', 'userPassSalt', 'userNiceName',
        'userEmail', 'userLink', 'userRegistered', 'userStatus'
      ],
      include: [{
        model: UserMetaModel,
        attributes: ['metaId', 'userId', 'metaKey', 'metaValue']
      }],
      where: {
        userLogin: {
          [Op.eq]: username
        }
      }
    }).then((user) => {
      const userMeta: Record<string, string> = {};
      if (user) {
        user.userMeta.forEach((item) => {
          userMeta[item.metaKey] = item.metaValue;
        });
        return {
          ...user.get({
            plain: true
          }),
          meta: userMeta
        };
      }
      return null;
    }).catch((e) => {
      this.logger.error({
        message: e.message || '用户查询失败',
        data: { username },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getUserById(userId: string): Promise<UserModel> {
    return this.userModel.findByPk(userId).catch((e) => {
      this.logger.error({
        message: e.message || '用户查询失败',
        data: { userId },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }
}
