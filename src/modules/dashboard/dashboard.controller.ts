import { Controller, Get, HttpStatus, Redirect, UseGuards } from '@nestjs/common';
import { Role } from '../../common/common.enum';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  @Get()
  @Redirect('/admin/post', HttpStatus.FOUND)
  async dashboard() {

  }
}
