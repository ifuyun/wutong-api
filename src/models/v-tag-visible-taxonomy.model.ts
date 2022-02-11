import { Column, DataType, ForeignKey, Model, PrimaryKey, Table, Unique } from 'Sequelize-typescript';
import { PostModel } from './post.model';

@Table({
  tableName: 'v_tag_visible_taxonomy',
  timestamps: false
})
export class VTagVisibleTaxonomyModel extends Model {
  @ForeignKey(() => PostModel)
  @PrimaryKey
  @Column({
    field: 'object_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  objectId: string;

  @PrimaryKey
  @Column({
    field: 'taxonomy_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  taxonomyId: string;

  @Unique
  @Column({
    field: 'slug',
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: ''
  })
  slug: string;

  @Column({
    field: 'taxonomy',
    type: DataType.ENUM('post', 'link', 'tag'),
    allowNull: false,
    defaultValue: 'post'
  })
  taxonomy: string;

  @Column({
    field: 'term_order',
    type: DataType.INTEGER({
      length: 11,
      unsigned: true
    }),
    allowNull: false,
    defaultValue: 0
  })
  termOrder: number;
}
