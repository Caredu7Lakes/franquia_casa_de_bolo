import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OwnerGuard } from './guards/owner.guard';
import { UserRole } from '../tenancy/entities/user.entity';

/**
 * Gestão de usuários do painel — restrita ao OWNER do tenant.
 * O tenant vem do token (req.user.tenant_id), garantindo isolamento.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Req() req: any) {
    return this.usersService.list(req.user.tenant_id);
  }

  @Post()
  create(
    @Req() req: any,
    @Body() body: { email: string; password: string; name?: string; role?: UserRole },
  ) {
    return this.usersService.create(req.user.tenant_id, body);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { password?: string; name?: string; role?: UserRole; active?: boolean },
  ) {
    return this.usersService.update(req.user.tenant_id, id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.usersService.remove(req.user.tenant_id, id);
  }
}
