import {  BelongsToMany, Column, CreatedAt, DataType,  Model, PrimaryKey, Sequelize, Table, UpdatedAt } from 'sequelize-typescript';
import TaxonomyModel from './taxonomy.model';
import TaxonomyRelationshipModel from './taxonomy-relationship.model';

@Table({
  tableName: 'links',
  deletedAt: false
})
export default class LinkModel extends Model {
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
    field: 'link_url',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  linkUrl: string;

  @Column({
    field: 'link_name',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  linkName: string;

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
  linkTarget: string;

  @Column({
    field: 'link_description',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  linkDescription: string;

  @Column({
    field: 'link_visible',
    type: DataType.ENUM('site', 'homepage', 'invisible'),
    allowNull: false,
    defaultValue: 'site'
  })
  linkVisible: string;

  @Column({
    field: 'link_owner',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  linkOwner: string;

  @Column({
    field: 'link_rating',
    type: DataType.INTEGER({
      length: 11,
      unsigned: true
    }),
    allowNull: false,
    defaultValue: 0
  })
  linkRating: number;

  @CreatedAt
  @Column({
    field: 'link_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  linkCreated: Date;

  @UpdatedAt
  @Column({
    field: 'link_modified',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  linkModified: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: '',
    field: 'link_rss'
  })
  linkRss: string;
}
