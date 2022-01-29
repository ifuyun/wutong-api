import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import CommentModel from './comment.model';

@Table({
  tableName: 'comment_meta',
  timestamps: false
})
export default class CommentMetaModel extends Model {
  @PrimaryKey
  @Column({
    field: 'meta_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  metaId: string;

  @ForeignKey(() => CommentModel)
  @Column({
    field: 'comment_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  commentId: string;

  @BelongsTo(() => CommentModel)
  comment: CommentModel;

  @Column({
    field: 'meta_key',
    type: DataType.STRING(255)
  })
  metaKey: string;

  @Column({
    field: 'meta_value',
    type: DataType.TEXT
  })
  metaValue: string;
}
