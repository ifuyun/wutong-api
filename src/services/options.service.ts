import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { LinkDto } from '../dtos/link.dto';
import { OptionData } from '../interfaces/options.interface';
import OptionModel from '../models/option.model';
import LoggerService from './logger.service';

@Injectable()
export default class OptionsService {
  constructor(
    @InjectModel(OptionModel)
    private readonly optionModel: typeof OptionModel,
    private readonly logger: LoggerService,
    private readonly sequelize: Sequelize
  ) {
  }

  async getOptions(onlyAutoLoad: boolean = true): Promise<Record<string, OptionData>> {
    const queryOpt: any = {
      attributes: ['blogId', 'optionName', 'optionValue', 'autoload']
    };
    if (onlyAutoLoad) {
      queryOpt.where = {
        autoload: {
          [Op.eq]: 1
        }
      };
    }

    // todo: remove blogId
    return this.optionModel.findAll(queryOpt).then((data) => {
      let options: Record<string, OptionData> = {};
      data.forEach((item) => {
        options[item.optionName] = {
          value: item.optionValue,
          blogId: item.blogId
        };
      });
      return Promise.resolve(options);
    });
  }

  async saveOptions(options: Record<string, string>): Promise<boolean> {
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
