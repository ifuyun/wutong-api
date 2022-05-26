import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { PostModel } from './post.model';
import { TaxonomyModel } from './taxonomy.model';
import { LinkModel } from './link.model';

@Table({
  tableName: 'taxonomy_relationships',
  timestamps: false
})
export class TaxonomyRelationshipModel extends Model {
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
    field: 'taxonomy_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  taxonomyId: string;

  @BelongsTo(() => TaxonomyModel)
  taxonomy: TaxonomyModel;

  @BelongsTo(() => PostModel)
  post: PostModel;

  @Column({
    field: 'term_order',
    type: DataType.INTEGER({
      length: 11
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 0
  })
  termOrder: number;
}
