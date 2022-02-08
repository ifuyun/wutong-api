import { Body, Controller, Get, Header, HttpStatus, Post, Render, Req } from '@nestjs/common';
import { ResponseCode } from '../../common/response-codes.enum';
import { OptionDto } from '../../dtos/option.dto';
import CustomException from '../../exceptions/custom.exception';
import TrimPipe from '../../pipes/trim.pipe';
import OptionsService from '../../services/options.service';
import UtilService from '../../services/util.service';

@Controller('admin/setting')
export default class AdminOptionController {
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
        title: this.utilService.getTitle([title, '站点设置', '管理后台', options.site_name.value]),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      curNav: 'setting',
      token: req.csrfToken(),
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
      site_name: optionDto.siteName,
      site_description: optionDto.siteDescription,
      site_slogan: optionDto.siteSlogan,
      site_url: optionDto.siteUrl,
      site_keywords: <string>optionDto.siteKeywords,
      admin_email: optionDto.adminEmail,
      icp_num: optionDto.icpNum,
      copyright_notice: optionDto.copyNotice,
      upload_url_prefix: optionDto.uploadUrlPrefix
    };
    const result = await this.optionsService.saveOptions(data);
    if (!result) {
      throw new CustomException(ResponseCode.OPTION_SAVE_ERROR, HttpStatus.OK, '保存失败。');
    }

    return {
      code: ResponseCode.SUCCESS,
      data: {
        url: '/admin/setting'
      }
    };
  }
}
