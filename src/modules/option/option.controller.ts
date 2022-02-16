import { Controller, Get, Header } from '@nestjs/common';
import { OptionsService } from './options.service';
import { getSuccessResponse } from '../../transformers/response.transformers';

@Controller('api')
export class OptionController {
  constructor(private readonly optionsService: OptionsService) {
  }

  @Get('options')
  @Header('Content-Type', 'application/json')
  async getOptions() {
    const options = await this.optionsService.getOptions(false);
    return getSuccessResponse(options);
  }
}
