import { Controller, Get, Header, Query } from '@nestjs/common';
import { OptionsService } from './options.service';
import { getSuccessResponse } from '../../transformers/response.transformers';

@Controller('api')
export class OptionController {
  constructor(private readonly optionsService: OptionsService) {
  }

  @Get('options')
  @Header('Content-Type', 'application/json')
  async getOptions(@Query() query) {
    const auto: boolean = typeof query.auto === 'boolean' ? query.auto : true;
    const options = await this.optionsService.getOptions(auto);
    return getSuccessResponse(options);
  }
}
