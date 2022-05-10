import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { DbQueryErrorException } from '../../exceptions/db-query-error.exception';
import { PostMetaModel } from '../../models/post-meta.model';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class PostMetaService {
  constructor(
    @InjectModel(PostMetaModel)
    private readonly postMetaModel: typeof PostMetaModel,
    private readonly logger: LoggerService
  ) {
    this.logger.setLogger(this.logger.sysLogger);
  }

  getPostMetaByPostIds(postIds: string[]): Promise<PostMetaModel[]> {
    return this.postMetaModel.findAll({
      attributes: ['postId', 'metaKey', 'metaValue'],
      where: {
        postId: {
          [Op.in]: postIds
        }
      }
    }).catch((e) => {
      this.logger.error({
        message: e.message || 'post meta查询失败',
        data: { postIds },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }

  getPostMetaByPostId(postId: string, key?: string): Promise<PostMetaModel[]> {
    const where: WhereOptions = {
      postId
    };
    if (key) {
      where.metaKey = key;
    }
    return this.postMetaModel.findAll({
      attributes: ['postId', 'metaKey', 'metaValue'],
      where
    }).catch((e) => {
      this.logger.error({
        message: e.message || 'post meta查询失败',
        data: { postId, key },
        stack: e.stack
      });
      throw new DbQueryErrorException();
    });
  }
}
