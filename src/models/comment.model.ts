import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany, Model, PrimaryKey, Sequelize, Table, UpdatedAt } from 'sequelize-typescript';
import { PostModel } from './post.model';
import { CommentMetaModel } from './comment-meta.model';
import { VoteModel } from './vote.model';

@Table({
  tableName: 'comments',
  deletedAt: false
})
export class CommentModel extends Model {
  @PrimaryKey
  @Column({
    field: 'comment_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  commentId: string;

  @HasMany(() => CommentMetaModel)
  commentMeta: CommentMetaModel[];

  @HasMany(() => VoteModel)
  votes: VoteModel[];

  @ForeignKey(() => PostModel)
  @Column({
    field: 'post_id',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  postId: string;

  @BelongsTo(() => PostModel)
  post: PostModel;

  @Column({
    field: 'comment_content',
    type: DataType.TEXT,
    allowNull: false,
    defaultValue: ''
  })
  commentContent: string;

  @Column({
    field: 'comment_status',
    type: DataType.ENUM('normal', 'pending', 'reject', 'spam', 'trash'),
    allowNull: false,
    defaultValue: 'pending'
  })
  commentStatus: string;

  commentStatusDesc: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    field: 'comment_author'
  })
  commentAuthor: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: '',
    field: 'comment_author_email'
  })
  commentAuthorEmail: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: '',
    field: 'comment_author_link'
  })
  commentAuthorLink: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: '',
    field: 'comment_ip'
  })
  commentIp: string;

  // todo: to be renamed
  @CreatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    field: 'comment_created'
  })
  created: Date;

  createdText: string;

  // todo: to be removed
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    field: 'comment_created_gmt'
  })
  commentCreatedGmt: Date;

  // todo: to be renamed
  @UpdatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    field: 'comment_modified'
  })
  modified: Date;

  // todo: to be removed
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    field: 'comment_modified_gmt'
  })
  commentModifiedGmt: Date;

  @Column({
    type: DataType.INTEGER({
      length: 10,
      unsigned: true
    }),
    allowNull: false,
    defaultValue: 0,
    field: 'comment_vote'
  })
  commentVote: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: '',
    field: 'comment_agent'
  })
  commentAgent: string;

  @Column({
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: '',
    field: 'parent_id'
  })
  parentId: string;

  @Column({
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: '',
    field: 'user_id'
  })
  userId: string;
}
