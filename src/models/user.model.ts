import { Column, CreatedAt, DataType, HasMany, Model, PrimaryKey, Sequelize, Table } from 'sequelize-typescript';
import { PostModel } from './post.model';
import { UserMetaModel } from './user-meta.model';

@Table({
  tableName: 'users',
  updatedAt: false,
  deletedAt: false
})
export class UserModel extends Model {
  @PrimaryKey
  @Column({
    field: 'user_id',
    type: DataType.CHAR(16),
    allowNull: false
  })
  userId: string;

  @HasMany(() => PostModel)
  posts: PostModel[];

  @HasMany(() => UserMetaModel)
  userMeta: UserMetaModel[];

  @Column({
    field: 'user_login',
    type: DataType.CHAR(16),
    allowNull: false,
    defaultValue: ''
  })
  userLogin: string;

  @Column({
    field: 'user_pass',
    type: DataType.STRING(64),
    allowNull: false,
    defaultValue: ''
  })
  userPass: string;

  @Column({
    field: 'user_pass_salt',
    type: DataType.STRING(32),
    allowNull: false,
    defaultValue: ''
  })
  userPassSalt: string;

  @Column({
    field: 'user_nicename',
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: ''
  })
  userNiceName: string;

  @Column({
    field: 'user_email',
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: ''
  })
  userEmail: string;

  @Column({
    field: 'user_link',
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: ''
  })
  userLink: string;

  @CreatedAt
  @Column({
    field: 'user_registered',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  })
  userRegistered: Date;

  @Column({
    field: 'user_activation_key',
    type: DataType.STRING(60),
    allowNull: false,
    defaultValue: ''
  })
  userActivationKey: string;

  @Column({
    type: DataType.INTEGER({
      length: 11,
      unsigned: true
    }),
    allowNull: false,
    defaultValue: 0,
    field: 'user_status'
  })
  userStatus: number;

  // todo: to be removed
  @Column({
    field: 'user_display_name',
    type: DataType.STRING(250),
    allowNull: false,
    defaultValue: ''
  })
  userDisplayName: string;
}
