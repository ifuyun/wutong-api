import { Body, Controller, Get, Header, Post, Query, UseGuards } from '@nestjs/common';
import * as xss from 'sanitizer';
import { Role } from '../../common/common.enum';
import { Message } from '../../common/message.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { Roles } from '../../decorators/roles.decorator';
import {
  DiscussionOptionsDto,
  GeneralOptionsDto,
  MediaOptionsDto,
  ReadingOptionsDto,
  WritingOptionsDto
} from '../../dtos/option.dto';
import { BadRequestException } from '../../exceptions/bad-request.exception';
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

  @Post('writing')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveWritingOptions(
    @Body(new TrimPipe()) optionDto: WritingOptionsDto
  ) {
    const data = {
      default_post_category: optionDto.defaultCategory,
      default_post_format: optionDto.defaultPostFormat
    };
    const result = await this.optionService.saveOptions(data);
    if (!result) {
      throw new UnknownException(Message.OPTION_SAVE_ERROR, ResponseCode.OPTION_SAVE_ERROR);
    }

    return getSuccessResponse();
  }

  @Post('reading')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveReadingOptions(
    @Body(new TrimPipe()) optionDto: ReadingOptionsDto
  ) {
    if (![0, 1].includes(optionDto.rssUseExcerpt)) {
      throw new BadRequestException(Message.PARAM_ILLEGAL);
    }
    const data = {
      posts_per_page: optionDto.postsPerPage,
      posts_per_rss: optionDto.postsPerRss,
      rss_use_excerpt: optionDto.rssUseExcerpt
    };
    const result = await this.optionService.saveOptions(data);
    if (!result) {
      throw new UnknownException(Message.OPTION_SAVE_ERROR, ResponseCode.OPTION_SAVE_ERROR);
    }

    return getSuccessResponse();
  }

  @Post('discussion')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveDiscussionOptions(
    @Body(new TrimPipe()) optionDto: DiscussionOptionsDto
  ) {
    const data = {
      default_comment_status: optionDto.defaultCommentStatus,
      comment_registration: optionDto.commentRegistration ? 1 : 0,
      thread_comments: optionDto.threadComments ? 1 : 0,
      thread_comments_depth: optionDto.threadCommentsDepth,
      page_comments: optionDto.pageComments ? 1 : 0,
      comments_per_page: optionDto.commentsPerPage,
      default_comments_page: optionDto.defaultCommentsPage,
      comment_order: optionDto.commentOrder,
      comments_notify: optionDto.commentsNotify ? 1 : 0,
      moderation_notify: optionDto.moderationNotify ? 1 : 0,
      comment_moderation: optionDto.commentModeration ? 1 : 0,
      comment_previously_approved: optionDto.commentPreviouslyApproved ? 1 : 0,
      show_avatars: optionDto.showAvatars ? 1 : 0,
      avatar_default: optionDto.avatarDefault
    };
    const result = await this.optionService.saveOptions(data);
    if (!result) {
      throw new UnknownException(Message.OPTION_SAVE_ERROR, ResponseCode.OPTION_SAVE_ERROR);
    }

    return getSuccessResponse();
  }

  @Post('media')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'application/json')
  async saveMediaOptions(
    @Body(new TrimPipe()) optionDto: MediaOptionsDto
  ) {
    const data = {
      upload_max_file_limit: optionDto.uploadFileLimit,
      upload_max_file_size: optionDto.uploadFileSize,
      upload_path: optionDto.uploadPath,
      static_resource_host: optionDto.staticResourceHost,
      upload_url_prefix: optionDto.uploadUrlPrefix,
      watermark_font_path: optionDto.watermarkFontPath
    };
    const result = await this.optionService.saveOptions(data);
    if (!result) {
      throw new UnknownException(Message.OPTION_SAVE_ERROR, ResponseCode.OPTION_SAVE_ERROR);
    }

    return getSuccessResponse();
  }
}
