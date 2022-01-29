import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import PostModel from './post.model';
import TaxonomyModel from './taxonomy.model';
import LinkModel from './link.model';

@Table({
  tableName: 'term_relationships',
  timestamps: false
})
export default class TaxonomyRelationshipModel extends Model {
  @ForeignKey(() => PostModel)
  @ForeignKey(() => LinkModel)
  @PrimaryKey
  @Column({
    field: 'object_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  objectId: string;

  // @BelongsTo(() => PostModel)
  // post: PostModel;

  @ForeignKey(() => TaxonomyModel)
  @PrimaryKey
  @Column({
    field: 'term_taxonomy_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  termTaxonomyId: string;

  @BelongsTo(() => TaxonomyModel)
  taxonomy: TaxonomyModel;

  @BelongsTo(() => PostModel)
  post: PostModel;

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
