import { BelongsToMany, Column, CreatedAt, DataType, HasMany, Model, PrimaryKey, Sequelize, Table, Unique, UpdatedAt } from 'sequelize-typescript';
import { TaxonomyStatus } from '../common/common.enum';
import { TaxonomyRelationshipModel } from './taxonomy-relationship.model';
import { PostModel } from './post.model';
import { LinkModel } from './link.model';

@Table({
  tableName: 'term_taxonomy',
  deletedAt: false
})
export class TaxonomyModel extends Model {
  @PrimaryKey
  @Column({
    field: 'taxonomy_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  taxonomyId: string;

  @HasMany(() => TaxonomyRelationshipModel)
  taxonomyRelationships: TaxonomyRelationshipModel[];

  @BelongsToMany(() => PostModel, () => TaxonomyRelationshipModel)
  posts: PostModel[];

  @BelongsToMany(() => LinkModel, () => TaxonomyRelationshipModel)
  links: LinkModel[];

  @Column({
    field: 'type',
    type: DataType.ENUM('post', 'link', 'tag'),
    allowNull: false,
    defaultValue: 'post'
  })
  type: string;

  @Column({
    field: 'name',
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: ''
  })
  name: string;

  @Unique
  @Column({
    field: 'slug',
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: ''
  })
  slug: string;

  @Column({
    field: 'description',
    type: DataType.TEXT,
    allowNull: false
  })
  description: string;

  @Column({
    field: 'parent',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  parentId: string;

  @Column({
    field: 'term_group',
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0
  })
  termGroup: number;

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

  @Column({
    field: 'status',
    type: DataType.ENUM('publish', 'private', 'trash'),
    allowNull: false,
    defaultValue: 'publish'
  })
  status: TaxonomyStatus;

  @Column({
    field: 'is_required',
    type: DataType.TINYINT,
    allowNull: false,
    defaultValue: 0
  })
  isRequired: number;

  @Column({
    field: 'count',
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0
  })
  count: number;

  @CreatedAt
  @Column({
    field: 'created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  created: Date;

  @UpdatedAt
  @Column({
    field: 'modified',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  modified: Date;
}
