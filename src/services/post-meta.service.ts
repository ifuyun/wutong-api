import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import PostMetaModel from '../models/post-meta.model';

@Injectable()
export default class PostMetaService {
  constructor(
    @InjectModel(PostMetaModel)
    private readonly postMetaModel: typeof PostMetaModel
  ) {
  }

  getPostMetaByPostIds(postIds: string[]): Promise<PostMetaModel[]> {
    return this.postMetaModel.findAll({
      attributes: ['postId', 'metaKey', 'metaValue'],
      where: {
        postId: {
          [Op.in]: postIds
        }
      }
    });
  }
}
