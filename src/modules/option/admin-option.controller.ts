import { Body, Controller, Get, Header, HttpStatus, Post, Render, Req, UseGuards } from '@nestjs/common';
import * as xss from 'sanitizer';
import { OptionsService } from './options.service';
import { UtilService } from '../util/util.service';
import { Role } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { Roles } from '../../decorators/roles.decorator';
import { OptionDto } from '../../dtos/option.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { TrimPipe } from '../../pipes/trim.pipe';

@Controller('admin/setting')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminOptionController {
  constructor(
    private readonly optionsService: OptionsService,
    private readonly utilService: UtilService
  ) {
  }

  @Get('')
  @Render('admin/pages/setting')
  async showOptions(@Req() req) {
    const options = await this.optionsService.getOptions(false);
    const title = '常规选项';

    return {
      meta: {
        title: this.utilService.getTitle([title, '站点设置', '管理后台', options.site_name]),
        description: `${options.site_name}管理后台`,
        author: options.site_author
      },
      curNav: 'setting',
      // token: req.csrfToken(),
      options,
      title
    };
  }

  @Post('save')
  @Header('Content-Type', 'application/json')
  async saveOptions(
    @Body(new TrimPipe()) optionDto: OptionDto
  ) {
    const data = {
      site_name: xss.sanitize(optionDto.siteName),
      site_description: xss.sanitize(optionDto.siteDescription),
      site_slogan: xss.sanitize(optionDto.siteSlogan),
      site_url: optionDto.siteUrl,
      site_keywords: xss.sanitize(optionDto.siteKeywords),
      admin_email: optionDto.adminEmail,
      icp_num: xss.sanitize(optionDto.icpNum),
      copyright_notice: xss.sanitize(optionDto.copyNotice),
      upload_url_prefix: xss.sanitize(optionDto.uploadUrlPrefix)
    };
    const result = await this.optionsService.saveOptions(data);
    if (!result) {
      throw new CustomException('保存失败。', HttpStatus.OK, ResponseCode.OPTION_SAVE_ERROR);
    }

    return {
      code: ResponseCode.SUCCESS,
      data: {
        url: '/admin/setting'
      }
    };
  }
}
