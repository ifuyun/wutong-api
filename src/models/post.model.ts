import {
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Sequelize,
  Table
} from 'sequelize-typescript';
import { DataType } from 'sequelize-typescript';
import { CommentFlag, PostStatus, PostType } from '../common/common.enum';
import { UserModel } from './user.model';
import { CommentModel } from './comment.model';
import { TaxonomyRelationshipModel } from './taxonomy-relationship.model';
import { TaxonomyModel } from './taxonomy.model';
import { PostMetaModel } from './post-meta.model';
import { VoteModel } from './vote.model';

@Table({
  tableName: 'posts',
  updatedAt: false,
  deletedAt: false
})
export class PostModel extends Model {
  @PrimaryKey
  @Column({
    field: 'post_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  postId: string;

  @HasMany(() => PostMetaModel)
  postMeta: PostMetaModel[];

  @HasMany(() => CommentModel)
  comments: CommentModel[];

  @HasMany(() => VoteModel)
  votes: VoteModel[];

  @BelongsToMany(() => TaxonomyModel, () => TaxonomyRelationshipModel)
  taxonomies: TaxonomyModel[];

  @HasMany(() => TaxonomyRelationshipModel)
  taxonomyRelationships: TaxonomyRelationshipModel[];

  @Column({
    field: 'post_title',
    type: DataType.TEXT,
    allowNull: false
  })
  postTitle: string;

  @Column({
    field: 'post_name',
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: ''
  })
  postName: string;

  @Column({
    field: 'post_content',
    type: DataType.TEXT('long'),
    allowNull: false
  })
  postContent: string;

  @Column({
    field: 'post_excerpt',
    type: DataType.TEXT,
    allowNull: false
  })
  postExcerpt: string;

  @Column({
    field: 'post_date',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  postDate: Date;

  @Column({
    field: 'post_original',
    type: DataType.TINYINT({
      length: 1
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 1
  })
  postOriginal: number;

  @Column({
    field: 'post_status',
    type: DataType.ENUM('publish', 'password', 'private', 'pending', 'draft', 'auto-draft', 'inherit', 'trash'),
    allowNull: false,
    defaultValue: 'publish'
  })
  postStatus: PostStatus;

  @Column({
    field: 'post_password',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  postPassword: string;

  @Column({
    field: 'comment_flag',
    type: DataType.ENUM('open', 'verify', 'close'),
    allowNull: false,
    defaultValue: 'verify'
  })
  commentFlag: CommentFlag;

  @Column({
    field: 'post_type',
    type: DataType.ENUM('post', 'page', 'revision', 'attachment', 'status', 'quote', 'note', 'image', 'video', 'audio'),
    allowNull: false,
    defaultValue: 'post'
  })
  postType: PostType;

  @ForeignKey(() => UserModel)
  @Column({
    field: 'post_author',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  postAuthor: string;

  @BelongsTo(() => UserModel)
  author: UserModel;

  @Column({
    field: 'post_guid',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  postGuid: string;

  @Column({
    field: 'post_parent',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  postParent: string;

  @Column({
    field: 'post_mime_type',
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: ''
  })
  postMimeType: string;

  @CreatedAt
  @Column({
    field: 'post_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  postCreated: Date;

  @Column({
    field: 'post_modified',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  postModified: Date;

  @Column({
    field: 'comment_count',
    type: DataType.BIGINT({
      length: 20
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 0
  })
  commentCount: number;

  @Column({
    field: 'post_view_count',
    type: DataType.BIGINT({
      length: 20
    }).UNSIGNED,
    allowNull: false,
    defaultValue: 0
  })
  postViewCount: number;
}
