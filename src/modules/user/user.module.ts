import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './user.controller';
import { UsersService } from './users.service';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { OptionModule } from '../option/option.module';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    ConfigModule,
    OptionModule
  ],
  controllers: [UserController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UserModule {
}
