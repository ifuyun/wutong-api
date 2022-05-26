import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { PostStatus, PostType } from '../common/common.enum';

@Table({
  tableName: 'v_post_views_average',
  timestamps: false
})
export class VPostViewAverageModel extends Model {
  @Column({
    field: 'post_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  postId: string;

  @Column({
    field: 'post_title',
    type: DataType.TEXT,
    allowNull: false
  })
  postTitle: string;

  @Column({
    field: 'post_status',
    type: DataType.ENUM('publish', 'password', 'private', 'pending', 'draft', 'auto-draft', 'inherit', 'trash'),
    allowNull: false,
    defaultValue: 'publish'
  })
  postStatus: PostStatus;

  @Column({
    field: 'post_type',
    type: DataType.ENUM('post', 'page', 'revision', 'attachment', 'status', 'quote', 'note', 'image', 'video', 'audio'),
    allowNull: false,
    defaultValue: 'post'
  })
  postType: PostType;

  @Column({
    field: 'post_guid',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  postGuid: string;

  @Column({
    field: 'post_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: '0000-00-00 00:00:00'
  })
  postCreated: Date;

  @Column({
    field: 'days',
    type: DataType.INTEGER({
      length: 11
    }).UNSIGNED
  })
  days: number;

  @Column({
    field: 'views',
    type: DataType.BIGINT({
      length: 20
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 0
  })
  views: number;

  @Column({
    field: 'views_average',
    type: DataType.DECIMAL
  })
  viewsAverage: number;
}
