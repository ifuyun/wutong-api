import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { UserLoginDto } from '../dtos/user-login.dto';
import { UserVo } from '../interfaces/users.interface';
import UserModel from '../models/user.model';
import UserMetaModel from '../models/user-meta.model';

@Injectable()
export default class UsersService {
  constructor(
    @InjectModel(UserModel)
    private readonly userModel: typeof UserModel
  ) {
  }

  async login(loginDto: UserLoginDto): Promise<UserVo> {
    return this.userModel.findOne({
      attributes: ['userId', 'userLogin', 'userNiceName', 'userEmail', 'userLink', 'userRegistered', 'userStatus', 'userDisplayName'],
      include: [{
        model: UserMetaModel,
        attributes: ['metaId', 'userId', 'metaKey', 'metaValue']
      }],
      where: {
        userLogin: {
          [Op.eq]: loginDto.username
        },
        userPass: Sequelize.fn('md5', Sequelize.fn('concat', Sequelize.col('user_pass_salt'), loginDto.password))
      }
    }).then((user) => {
      const userMeta: Record<string, string> = {};
      if (user) {
        user.userMeta.forEach((item) => {
          userMeta[item.metaKey] = item.metaValue;
        });
        return Promise.resolve({
          ...user.get({
            plain: true
          }),
          userMeta
        });
      }
      return Promise.resolve(null);
    });
  }

  async getUserById(userId: string): Promise<UserModel> {
    return this.userModel.findByPk(userId);
  }
}
