import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { PostModel } from './post.model';

@Table({
  tableName: 'post_meta',
  timestamps: false
})
export class PostMetaModel extends Model {
  @PrimaryKey
  @Column({
    field: 'meta_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  metaId: string;

  @ForeignKey(() => PostModel)
  @Column({
    field: 'post_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  postId: string;

  @BelongsTo(() => PostModel)
  post: PostModel;

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
