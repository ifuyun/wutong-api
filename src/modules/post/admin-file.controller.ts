import { Controller, Get, Header, HttpStatus, Post, Render, Req, Session, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import * as formidable from 'formidable';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as path from 'path';
import * as xss from 'sanitizer';
import { PostStatus, PostType, Role } from '../../common/common.enum';
import { ResponseCode } from '../../common/response-code.enum';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { Referer } from '../../decorators/referer.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { PostFileDto } from '../../dtos/post.dto';
import { CustomException } from '../../exceptions/custom.exception';
import { RolesGuard } from '../../guards/roles.guard';
import { getFileExt, getUuid } from '../../helpers/helper';
import { OptionsService } from '../option/options.service';
import { UtilService } from '../util/util.service';
import { WatermarkService } from '../util/watermark.service';
import { PostService } from './post.service';

@Controller('admin/file')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminFileController {
  constructor(
    private readonly optionsService: OptionsService,
    private readonly postService: PostService,
    private readonly utilService: UtilService,
    private readonly watermarkService: WatermarkService
  ) {
  }

  @Get('upload')
  @Render('admin/pages/upload-form')
  async showUpload(
    @Req() req: Request,
    @Referer() referer: string,
    @Session() session: any
  ) {
    const options = await this.optionsService.getOptions();
    session.uploadReferer = referer;

    return {
      meta: {
        title: this.utilService.getTitle(['上传文件', '管理后台', options.site_name]),
        description: `${options.site_name}管理后台`,
        author: options.site_author
      },
      // token: req.csrfToken(),
      curNav: `attachment`,
      options
    };
  }

  @Post('upload')
  @Header('Content-Type', 'application/json')
  async uploadFile(
    @Req() req: Request,
    @AuthUser() user,
    @Session() session: any
  ) {
    const now = moment();
    const curYear = now.format('YYYY');
    const curMonth = now.format('MM');
    // todo: move to database:options
    const uploadPath = path.join(__dirname, '../../..', 'web/public/upload', curYear, curMonth);
    mkdirp.sync(uploadPath);

    const form = formidable({
      keepExtensions: true,
      allowEmptyFiles: false,
      uploadDir: uploadPath,
      maxFileSize: 100 * 1024 * 1024,
      maxFields: 128,
      maxFieldsSize: 10 * 1024 * 1024
    });
    const result = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          return reject(err);
        }
        const fileExt = getFileExt(files.mediafile['originalFilename']);
        const fileName = getUuid() + fileExt;
        const filePath = path.join(uploadPath, fileName);
        fs.renameSync(files.mediafile['filepath'], filePath);
        resolve({
          fileRawName: files.mediafile['originalFilename'],
          fileName,
          filePath,
          fields
        });
      });
    });

    if (result['fields'].watermark !== '0') {
      await this.watermarkService.watermark(result['filePath']);
    }
    const options = await this.optionsService.getOptions(false);
    const postGuid = `${options.upload_url_prefix}/${curYear}/${curMonth}/${result['fileName']}`;
    const isPostGuidExist = await this.postService.checkPostGuidExist(postGuid);
    if (isPostGuidExist) {
      throw new CustomException('文件上传错误，请重新上传。', HttpStatus.OK, ResponseCode.UPLOAD_PATH_CONFLICT);
    }
    const fileDesc = xss.sanitize(result['fileRawName']);
    const fileData: PostFileDto = {
      postContent: fileDesc,
      postExcerpt: fileDesc,
      postTitle: fileDesc,
      postAuthor: user.userId,
      postStatus: PostStatus.PUBLISH,
      postType: PostType.ATTACHMENT,
      postOriginal: parseInt(result['fields'].original, 10) ? 1 : 0,
      postId: getUuid(),
      postGuid,
      postDate: new Date()
    };
    const post = await this.postService.saveFile(fileData);
    if (!post) {
      throw new CustomException('文件上传错误，请重新上传。', HttpStatus.OK, ResponseCode.UPLOAD_ERROR);
    }
    const referer = session.uploadReferer;
    delete session.uploadReferer;

    return {
      code: ResponseCode.SUCCESS,
      status: HttpStatus.OK,
      data: {
        url: referer || '/admin/post?type=attachment'
      }
    };
  }
}
