import { Column, DataType, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript';

@Table({
  tableName: 'options',
  timestamps: false
})
export class OptionModel extends Model {
  @PrimaryKey
  @Column({
    field: 'option_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  optionId: string;

  @Unique
  @Column({
    field: 'option_name',
    type: DataType.STRING(191),
    allowNull: false,
    defaultValue: ''
  })
  optionName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    field: 'option_value'
  })
  optionValue: string;

  @Column({
    field: 'autoload',
    type: DataType.INTEGER({
      length: 1
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 1
  })
  autoload: number;
}
