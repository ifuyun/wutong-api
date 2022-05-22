import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany, Model, PrimaryKey, Sequelize, Table, UpdatedAt } from 'sequelize-typescript';
import { CommentStatus } from '../common/common.enum';
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
    type: DataType.TEXT,
    allowNull: false,
    field: 'author_name'
  })
  authorName: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: '',
    field: 'author_email'
  })
  authorEmail: string;

  @Column({
    type: DataType.STRING(64),
    allowNull: false,
    defaultValue: '',
    field: 'author_email_hash'
  })
  authorEmailHash: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: '',
    field: 'author_link'
  })
  authorLink: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: '',
    field: 'author_ip'
  })
  authorIp: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: '',
    field: 'author_user_agent'
  })
  authorUserAgent: string;

  @Column({
    field: 'comment_status',
    type: DataType.ENUM('normal', 'pending', 'reject', 'spam', 'trash'),
    allowNull: false,
    defaultValue: 'pending'
  })
  commentStatus: CommentStatus;

  @Column({
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: '',
    field: 'user_id'
  })
  userId: string;

  @Column({
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: '',
    field: 'comment_parent'
  })
  commentParent: string;

  @Column({
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: '',
    field: 'comment_top'
  })
  commentTop: string;

  @Column({
    type: DataType.INTEGER({
      length: 10,
      unsigned: true
    }),
    allowNull: false,
    defaultValue: 0,
    field: 'comment_likes'
  })
  commentLikes: number;

  @Column({
    type: DataType.INTEGER({
      length: 10,
      unsigned: true
    }),
    allowNull: false,
    defaultValue: 0,
    field: 'comment_dislikes'
  })
  commentDislikes: number;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    field: 'comment_created'
  })
  commentCreated: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    field: 'comment_modified'
  })
  commentModified: Date;
}
