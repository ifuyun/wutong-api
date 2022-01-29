import { Column, CreatedAt, DataType, ForeignKey, Model, PrimaryKey, Sequelize, Table } from 'Sequelize-typescript';
import BookModel from './book.model';

@Table({
  tableName: 'notes',
  updatedAt: false,
  deletedAt: false
})
export default class NoteModel extends Model {
  @PrimaryKey
  @Column({
    field: 'note_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  noteId: string;

  @Column({
    field: 'note_content',
    type: DataType.TEXT,
    allowNull: false,
    defaultValue: ''
  })
  noteContent: string;

  @ForeignKey(() => BookModel)
  @Column({
    field: 'note_book_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  noteBookId: string;

  @Column({
    field: 'note_book_page',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  noteBookPage: string;

  @Column({
    field: 'note_status',
    type: DataType.ENUM('normal', 'trash'),
    allowNull: false,
    defaultValue: 'normal'
  })
  noteStatus: string;

  @Column({
    field: 'note_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  noteCreated: Date;
}
