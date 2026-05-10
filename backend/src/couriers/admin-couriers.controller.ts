import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CouriersService } from './couriers.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { ListCouriersQueryDto } from './dto/list-couriers.query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';

/**
 * Admin-only courier management. Mounted at /api/admin/couriers/*.
 *
 * `DELETE` is a soft delete (sets is_active=false) — orders.courier_id
 * stays intact so historical assignments remain auditable.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
@Controller('admin/couriers')
export class AdminCouriersController {
  constructor(private readonly couriers: CouriersService) {}

  @Get()
  list(@Query() query: ListCouriersQueryDto) {
    return this.couriers.list(query);
  }

  @Post()
  create(@Body() dto: CreateCourierDto) {
    return this.couriers.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couriers.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourierDto,
  ) {
    return this.couriers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.couriers.softDelete(id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.couriers.pause(id);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resume(@Param('id', ParseUUIDPipe) id: string) {
    return this.couriers.resume(id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    await this.couriers.resetPassword(id, dto.newPassword);
  }
}
