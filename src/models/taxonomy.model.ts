import {
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Sequelize,
  Table,
  Unique,
  UpdatedAt
} from 'sequelize-typescript';
import { TaxonomyStatus, TaxonomyType } from '../common/common.enum';
import { TaxonomyRelationshipModel } from './taxonomy-relationship.model';
import { PostModel } from './post.model';
import { LinkModel } from './link.model';

@Table({
  tableName: 'taxonomies',
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
    field: 'taxonomy_type',
    type: DataType.ENUM('post', 'link', 'tag'),
    allowNull: false,
    defaultValue: 'post'
  })
  taxonomyType: TaxonomyType;

  @Column({
    field: 'taxonomy_name',
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: ''
  })
  taxonomyName: string;

  @Unique
  @Column({
    field: 'taxonomy_slug',
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: ''
  })
  taxonomySlug: string;

  @Column({
    field: 'taxonomy_description',
    type: DataType.TEXT,
    allowNull: false
  })
  taxonomyDescription: string;

  @Column({
    field: 'taxonomy_icon',
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: ''
  })
  taxonomyIcon: string;

  @Column({
    field: 'taxonomy_parent',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  taxonomyParent: string;

  @Column({
    field: 'taxonomy_order',
    type: DataType.INTEGER({
      length: 11
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 0
  })
  taxonomyOrder: number;

  @Column({
    field: 'taxonomy_status',
    type: DataType.ENUM('publish', 'private', 'trash'),
    allowNull: false,
    defaultValue: 'publish'
  })
  taxonomyStatus: TaxonomyStatus;

  @Column({
    field: 'taxonomy_is_required',
    type: DataType.TINYINT({
      length: 1
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 0
  })
  taxonomyIsRequired: number;

  @CreatedAt
  @Column({
    field: 'taxonomy_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  taxonomyCreated: Date;

  @UpdatedAt
  @Column({
    field: 'taxonomy_modified',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  taxonomyModified: Date;

  @Column({
    field: 'object_count',
    type: DataType.BIGINT({
      length: 20
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 0
  })
  objectCount: number;
}
