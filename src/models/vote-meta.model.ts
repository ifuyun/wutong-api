import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { VoteModel } from './vote.model';

@Table({
  tableName: 'vote_meta',
  timestamps: false
})
export class VoteMetaModel extends Model {
  @PrimaryKey
  @Column({
    field: 'meta_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  metaId: string;

  @ForeignKey(() => VoteModel)
  @Column({
    field: 'vote_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  voteId: string;

  @BelongsTo(() => VoteModel)
  vote: VoteModel;

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
