import { Column, DataType, Model, Table } from 'Sequelize-typescript';

@Table({
  tableName: 'v_post_date_archive',
  timestamps: false
})
export default class VPostDateArchiveModel extends Model {
  @Column({
    field: 'post_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  postId: string;

  @Column({
    field: 'post_date',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: '0000-00-00 00:00:00'
  })
  postDate: Date;

  @Column({
    field: 'post_status',
    type: DataType.ENUM('publish', 'private', 'pending', 'draft', 'auto-draft', 'inherit', 'trash'),
    allowNull: false,
    defaultValue: 'publish'
  })
  postStatus: string;

  @Column({
    field: 'post_type',
    type: DataType.ENUM('post', 'page', 'revision', 'attachment'),
    allowNull: false,
    defaultValue: 'post'
  })
  postType: string;

  // todo: linkDate -> dateText
  @Column({
    field: 'link_date',
    type: DataType.STRING(7)
  })
  dateText: string;

  // todo: displayDate -> dateTitle
  @Column({
    field: 'display_date',
    type: DataType.STRING(12)
  })
  dateTitle: string;

  @Column({
    field: 'status',
    type: DataType.INTEGER({
      length: 1,
      unsigned: true
    }),
    defaultValue: 1
  })
  status: number;
}
