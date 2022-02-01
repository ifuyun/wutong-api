import { Controller, Get, HttpStatus, Redirect } from '@nestjs/common';

@Controller('admin')
export default class AdminController {
  @Get()
  @Redirect('/admin/post', HttpStatus.FOUND)
  async dashboard() {

  }
}
