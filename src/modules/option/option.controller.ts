import { Body, Controller, Get, Header, Post, Query, UseGuards } from '@nestjs/common';
import * as xss from 'sanitizer';
import { Role } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { Roles } from '../../decorators/roles.decorator';
import { GeneralOptionsDto } from '../../dtos/option.dto';
import { UnknownException } from '../../exceptions/unknown.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { TrimPipe } from '../../pipes/trim.pipe';
import { getSuccessResponse } from '../../transformers/response.transformers';
import { OptionService } from './option.service';

@Controller('api/options')
export class OptionController {
  constructor(private readonly optionService: OptionService) {
  }

  @Get()
  @Header('Content-Type', 'application/json')
  async getOptions(@Query('autoload', new ParseIntPipe(1)) autoload: number) {
    const options = await this.optionService.getOptions(!!autoload);
    return getSuccessResponse(options);
  }

  @Post('general')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveGeneralOptions(
    @Body(new TrimPipe()) optionDto: GeneralOptionsDto
  ) {
    const data = {
      site_name: xss.sanitize(optionDto.siteTitle),
      site_description: xss.sanitize(optionDto.siteDescription),
      site_slogan: xss.sanitize(optionDto.siteSlogan),
      site_url: optionDto.siteUrl,
      site_keywords: optionDto.siteKeywords.join(','),
      admin_email: optionDto.adminEmail,
      icp_num: xss.sanitize(optionDto.icpNum),
      copyright_notice: xss.sanitize(optionDto.copyNotice)
    };
    const result = await this.optionService.saveOptions(data);
    if (!result) {
      throw new UnknownException(Message.OPTION_SAVE_ERROR, ResponseCode.OPTION_SAVE_ERROR);
    }

    return getSuccessResponse();
  }
}
