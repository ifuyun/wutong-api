import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { difference } from 'lodash';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { format } from '../../helpers/helper';
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

  async getOptions(onlyAutoLoad = true): Promise<OptionEntity> {
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
      return options;
    }).catch((e) => {
      this.logger.error({
        message: e.message || '配置查询失败',
        data: { onlyAutoLoad },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getOptionByKey(key: string): Promise<OptionModel> {
    return this.optionModel.findOne({
      where: {
        optionName: key
      }
    }).then((option) => {
      if (!option) {
        throw new InternalServerErrorException(format(Message.OPTION_MISSED, key));
      }
      return option;
    }).catch((e) => {
      this.logger.error({
        message: e.message || '配置查询失败',
        data: { key },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  async getOptionByKeys(keys: string | string[]): Promise<OptionEntity> {
    return this.optionModel.findAll({
      where: {
        optionName: keys
      }
    }).then((data) => {
      const count = Array.isArray(keys) ? keys.length : 1;
      if (!data || data.length !== count) {
        const exists = data.map((item) => item.optionName);
        throw new InternalServerErrorException(
          format(Message.OPTION_MISSED, Array.isArray(keys) ? difference(keys, exists).join(',') : keys)
        );
      }
      const options: OptionEntity = {};
      data.forEach((item) => options[item.optionName] = item.optionValue);

      return options;
    }).catch((e) => {
      this.logger.error({
        message: e.message || '配置查询失败',
        data: { keys },
        stack: e.stack
      });
      throw new DbQueryErrorException();
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
    }).then(() => true).catch((e) => {
      this.logger.error({
        message: e.message || '设置保存失败',
        data: LinkDto,
        stack: e.stack
      });
      throw new DbQueryErrorException(Message.OPTION_SAVE_ERROR, ResponseCode.OPTION_SAVE_ERROR);
    });
  }
}
