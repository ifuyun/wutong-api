import { Column, DataType, Model, Table } from 'sequelize-typescript';

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
    type: DataType.ENUM('publish', 'private', 'pending', 'draft', 'auto-draft', 'inherit', 'trash'),
    allowNull: false,
    defaultValue: 'publish'
  })
  postStatus: string;

  @Column({
    field: 'post_guid',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  postGuid: string;

  @Column({
    field: 'post_type',
    type: DataType.ENUM('post', 'page'),
    allowNull: false,
    defaultValue: 'post'
  })
  postType: string;

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
      length: 7,
      unsigned: true
    })
  })
  days: number;

  @Column({
    field: 'views',
    type: DataType.BIGINT,
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
