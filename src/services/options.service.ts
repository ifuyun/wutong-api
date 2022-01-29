import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import OptionModel from '../models/option.model';
import { OptionData } from '../interfaces/options.interface';

@Injectable()
export default class OptionsService {
  constructor(
    @InjectModel(OptionModel)
    private readonly optionModel: typeof OptionModel
  ) {
  }

  getOptions(onlyAutoLoad: boolean = true): Promise<Record<string, OptionData>> {
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
}
