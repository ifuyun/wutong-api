import { Column, CreatedAt, DataType, Model, PrimaryKey, Sequelize, Table } from 'Sequelize-typescript';

@Table({
  tableName: 'materials',
  updatedAt: false,
  deletedAt: false
})
export class MaterialModel extends Model {
  @PrimaryKey
  @Column({
    field: 'material_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  materialId: string;

  @Column({
    field: 'material_title',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  materialTitle: string;

  @Column({
    field: 'material_content',
    type: DataType.TEXT,
    allowNull: false,
    defaultValue: ''
  })
  materialContent: string;

  @Column({
    field: 'material_author',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  materialAuthor: string;

  @Column({
    field: 'material_translator',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  materialTranslator: string;

  @Column({
    field: 'material_source',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  materialSource: string;

  @Column({
    field: 'material_press',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  materialPress: string;

  @Column({
    field: 'material_status',
    type: DataType.ENUM('normal', 'trash'),
    allowNull: false,
    defaultValue: 'normal'
  })
  materialStatus: string;

  @CreatedAt
  @Column({
    field: 'material_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  materialCreated: Date;
}
