import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Message } from '../../common/message.enum';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { LoggerService } from '../logger/logger.service';
import { LinkDto } from '../../dtos/link.dto';
import { OptionEntity } from './option.interface';
import { OptionModel } from '../../models/option.model';

@Injectable()
export class OptionService {
  constructor(
    @InjectModel(OptionModel)
    private readonly optionModel: typeof OptionModel,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
  }

  async getOptions(onlyAutoLoad: boolean = true): Promise<OptionEntity> {
    const queryOpt: any = {
      attributes: ['optionName', 'optionValue', 'autoload']
    };
    if (onlyAutoLoad) {
      queryOpt.where = {
        autoload: {
          [Op.eq]: 1
        }
      };
    }

    return this.optionModel.findAll(queryOpt).then((data) => {
      const options: OptionEntity = {};
      data.forEach((item) => options[item.optionName] = item.optionValue);
      return Promise.resolve(options);
    });
  }

  async getOptionByKey(key: string): Promise<OptionModel> {
    const option = await this.optionModel.findOne({
      where: {
        optionName: key
      }
    });
    if (!option) {
      throw new InternalServerErrorException(Message.OPTION_MISSED);
    }
    return option;
  }

  async getOptionByKeys(keys: string | string[]): Promise<OptionEntity> {
    return this.optionModel.findAll({
      where: {
        optionName: keys
      }
    }).then((data) => {
      const count = Array.isArray(keys) ? keys.length : 1;
      if (!data || data.length !== count) {
        throw new InternalServerErrorException(Message.OPTION_MISSED);
      }
      const options: OptionEntity = {};
      data.forEach((item) => options[item.optionName] = item.optionValue);
      return Promise.resolve(options);
    });
  }

  async saveOptions(options: Record<string, string | number>): Promise<boolean> {
    return this.sequelize.transaction(async (t) => {
      const keys = Object.keys(options);
      for (let key of keys) {
        await this.optionModel.update({
          optionValue: options[key]
        }, {
          where: {
            optionName: {
              [Op.eq]: key
            }
          },
          transaction: t
        });
      }
    }).then(() => {
      return Promise.resolve(true);
    }).catch((err) => {
      this.logger.error({
        message: '设置保存失败。',
        data: LinkDto,
        stack: err.stack
      });
      return Promise.resolve(false);
    });
  }
}
