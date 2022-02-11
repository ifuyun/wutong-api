import { BelongsTo, BelongsToMany, Column, CreatedAt, ForeignKey, HasMany, Model, PrimaryKey, Sequelize, Table } from 'sequelize-typescript';
import { DataType } from 'sequelize-typescript';
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

  postMetaMap: Record<string, string | number>;

  @HasMany(() => CommentModel)
  comments: CommentModel[];

  @HasMany(() => VoteModel)
  votes: VoteModel[];

  @BelongsToMany(() => TaxonomyModel, () => TaxonomyRelationshipModel)
  taxonomies: TaxonomyModel[];

  @HasMany(() => TaxonomyRelationshipModel)
  taxonomyRelationships: TaxonomyRelationshipModel[];

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
    field: 'post_date',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  postDate: Date;

  postDateText: string;

  @Column({
    field: 'post_date_gmt',
    type: DataType.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  postDateGmt: Date;

  @Column({
    field: 'post_content',
    type: DataType.TEXT,
    allowNull: false
  })
  postContent: string;

  @Column({
    field: 'post_title',
    type: DataType.TEXT,
    allowNull: false
  })
  postTitle: string;

  @Column({
    field: 'post_excerpt',
    type: DataType.TEXT,
    allowNull: false
  })
  postExcerpt: string;

  @Column({
    field: 'post_status',
    type: DataType.ENUM('publish', 'password', 'private', 'pending', 'draft', 'auto-draft', 'inherit', 'trash'),
    allowNull: false,
    defaultValue: 'publish'
  })
  postStatus: string;

  postStatusDesc: string;

  @Column({
    field: 'comment_flag',
    type: DataType.ENUM('open', 'verify', 'close'),
    allowNull: false,
    defaultValue: 'verify'
  })
  commentFlag: string;

  @Column({
    field: 'post_original',
    type: DataType.TINYINT({
      length: 1,
      unsigned: true
    }),
    allowNull: false,
    defaultValue: 1
  })
  postOriginal: number;

  @Column({
    field: 'post_password',
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: ''
  })
  postPassword: string;

  @Column({
    field: 'post_name',
    type: DataType.STRING(200),
    allowNull: false,
    defaultValue: ''
  })
  postName: string;

  @Column({
    field: 'post_modified',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  postModified: Date;

  postModifiedText: string;

  @Column({
    field: 'post_modified_gmt',
    type: DataType.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  postModifiedGmt: Date;

  @CreatedAt
  @Column({
    field: 'post_created',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  postCreated: Date;

  postCreatedText: string;

  @Column({
    field: 'post_parent',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  postParent: string;

  @Column({
    field: 'post_guid',
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: ''
  })
  postGuid: string;

  @Column({
    field: 'post_type',
    type: DataType.ENUM('post', 'page', 'revision', 'attachment'),
    allowNull: false,
    defaultValue: 'post'
  })
  postType: string;

  @Column({
    field: 'post_mime_type',
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: ''
  })
  postMimeType: string;

  @Column({
    field: 'comment_count',
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0
  })
  commentCount: number;

  @Column({
    field: 'post_view_count',
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0
  })
  postViewCount: number;
}
