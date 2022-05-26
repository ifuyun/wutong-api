import { Column, CreatedAt, DataType, HasMany, Model, PrimaryKey, Sequelize, Table } from 'sequelize-typescript';
import { NoteModel } from './note.model';

@Table({
  tableName: 'books',
  updatedAt: false,
  deletedAt: false
})
export class BookModel extends Model {
  @PrimaryKey
  @Column({
    field: 'book_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  bookId: string;

  @HasMany(() => NoteModel)
  notes: NoteModel[];

  @Column({
    field: 'book_name',
    type: DataType.STRING(255),
    allowNull: false
  })
  bookName: string;

  @Column({
    field: 'book_author',
    type: DataType.STRING(255),
    allowNull: false
  })
  bookAuthor: string;

  @Column({
    field: 'book_translator',
    type: DataType.STRING(255),
    allowNull: false
  })
  bookTranslator: string;

  @Column({
    field: 'book_press',
    type: DataType.STRING(255),
    allowNull: false
  })
  bookPress: string;

  @Column({
    field: 'book_edition',
    type: DataType.STRING(255),
    allowNull: false
  })
  bookEdition: string;

  @Column({
    field: 'book_isbn',
    type: DataType.STRING(127),
    allowNull: false
  })
  bookIsbn: string;

  @Column({
    field: 'book_price',
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  bookPrice: number;

  @Column({
    field: 'book_quantity',
    type: DataType.INTEGER({
      length: 11
    }).UNSIGNED,
    allowNull: false
  })
  bookQuantity: number;

  @Column({
    field: 'book_type',
    type: DataType.ENUM('book', 'newspaper', 'magazine', 'periodical', 'other'),
    allowNull: false,
    defaultValue: 'book'
  })
  bookType: string;

  @Column({
    field: 'book_media_type',
    type: DataType.ENUM('paper', 'kindle', 'wechat', 'other'),
    allowNull: false,
    defaultValue: 'paper'
  })
  bookMediaType: string;

  @Column({
    field: 'book_purchase_time',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  bookPurchaseTime: string;

  @Column({
    field: 'book_purchase_channel',
    type: DataType.ENUM('amazon', 'jd', 'tmall', 'dangdang', 'offline', 'other'),
    allowNull: false
  })
  bookPurchaseChannel: string;

  @Column({
    field: 'book_status',
    type: DataType.ENUM('normal', 'trash', 'loaned'),
    allowNull: false,
    defaultValue: 'normal'
  })
  bookStatus: string;

  @CreatedAt
  @Column({
    field: 'book_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  bookCreated: Date;
}
