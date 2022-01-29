import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import UserModel from './user.model';

@Table({
  tableName: 'user_meta',
  timestamps: false
})
export default class UserMetaModel extends Model {
  @PrimaryKey
  @Column({
    field: 'meta_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  metaId: string;

  @ForeignKey(() => UserModel)
  @Column({
    field: 'user_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  userId: string;

  @BelongsTo(() => UserModel)
  user: UserModel;

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
