import { BelongsToMany, Column, CreatedAt, DataType, Model, PrimaryKey, Sequelize, Table, UpdatedAt } from 'sequelize-typescript';
import { LinkStatus, LinkTarget, LinkScope } from '../common/common.enum';
import { TaxonomyModel } from './taxonomy.model';
import { TaxonomyRelationshipModel } from './taxonomy-relationship.model';

@Table({
  tableName: 'links',
  deletedAt: false
})
export class LinkModel extends Model {
  @PrimaryKey
  @Column({
    field: 'link_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  linkId: string;

  @BelongsToMany(() => TaxonomyModel, () => TaxonomyRelationshipModel)
  taxonomies: TaxonomyModel[];

  @Column({
    field: 'link_name',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  linkName: string;

  @Column({
    field: 'link_url',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  linkUrl: string;

  @Column({
    field: 'link_image',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  linkImage: string;

  @Column({
    field: 'link_target',
    type: DataType.ENUM('_blank', '_top', '_self'),
    allowNull: false,
    defaultValue: '_blank'
  })
  linkTarget: LinkTarget;

  @Column({
    field: 'link_description',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  linkDescription: string;

  @Column({
    field: 'link_scope',
    type: DataType.ENUM('site', 'homepage'),
    allowNull: false,
    defaultValue: 'site'
  })
  linkScope: LinkScope;

  @Column({
    field: 'link_status',
    type: DataType.ENUM('normal', 'trash'),
    allowNull: false,
    defaultValue: 'normal'
  })
  linkStatus: LinkStatus;

  @Column({
    field: 'link_owner',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  linkOwner: string;

  // todo: rename
  @Column({
    field: 'link_rating',
    type: DataType.INTEGER({
      length: 11,
      unsigned: true
    }),
    allowNull: false,
    defaultValue: 0
  })
  linkOrder: number;

  // todo: change column order
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: '',
    field: 'link_rss'
  })
  linkRss: string;

  // todo: rename
  @CreatedAt
  @Column({
    field: 'link_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  created: Date;

  // todo: rename
  @UpdatedAt
  @Column({
    field: 'link_modified',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  modified: Date;
}
