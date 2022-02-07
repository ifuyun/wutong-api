import { Controller, Get, Header, HttpStatus, Post, Render, Req, Session } from '@nestjs/common';
import * as formidable from 'formidable';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as path from 'path';
import * as xss from 'sanitizer';
import { PostStatus, PostType, ResponseCode } from '../../common/common.enum';
import Referer from '../../decorators/referer.decorator';
import User from '../../decorators/user.decorator';
import { PostFileDto } from '../../dtos/post.dto';
import CustomException from '../../exceptions/custom.exception';
import { getFileExt, getUuid } from '../../helpers/helper';
import CommonService from '../../services/common.service';
import OptionsService from '../../services/options.service';
import PostsService from '../../services/posts.service';
import UtilService from '../../services/util.service';

@Controller('admin/file')
export default class AdminFileController {
  constructor(
    private readonly postsService: PostsService,
    private readonly optionsService: OptionsService,
    private readonly utilService: UtilService,
    private readonly commonService: CommonService
  ) {
  }

  @Get('upload')
  @Render('admin/pages/upload-form')
  async showUpload(
    @Req() req,
    @Referer() referer,
    @Session() session
  ) {
    const options = await this.optionsService.getOptions();
    session.uploadReferer = referer;

    return {
      meta: {
        title: this.utilService.getTitle(['上传文件', '管理后台', options.site_name.value]),
        description: `${options.site_name.value}管理后台`,
        author: options.site_author.value
      },
      token: req.csrfToken(),
      curNav: `attachment`,
      options
    };
  }

  @Post('upload')
  @Header('Content-Type', 'application/json')
  async uploadFile(
    @Req() req,
    @User() user,
    @Session() session
  ) {
    const now = moment();
    const curYear = now.format('YYYY');
    const curMonth = now.format('MM');
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
        const fileExt = getFileExt(files.mediafile.originalFilename);
        const fileName = getUuid() + fileExt;
        const filePath = path.join(uploadPath, fileName);
        fs.renameSync(files.mediafile.filepath, filePath);
        resolve({
          rawName: files.mediafile.originalFilename,
          fileName,
          filePath,
          fields
        });
      });
    });

    if (result['fields'].watermark !== '0') {
      await this.commonService.watermark(result['filePath']);
    }
    const options = await this.optionsService.getOptions(false);
    const postGuid = `${options.upload_path_prefix.value}/${curYear}/${curMonth}/${result['fileName']}`;
    const isPostGuidExist = await this.postsService.checkPostGuidExist(postGuid);
    if (isPostGuidExist) {
      throw new CustomException(ResponseCode.UPLOAD_PATH_CONFLICT, HttpStatus.OK, '文件上传错误，请重新上传。');
    }
    const fileDesc = xss.sanitize(result['rawName']);
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
    const post = await this.postsService.saveFile(fileData);
    if (!post) {
      throw new CustomException(ResponseCode.UPLOAD_ERROR, HttpStatus.OK, '文件上传错误，请重新上传。');
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