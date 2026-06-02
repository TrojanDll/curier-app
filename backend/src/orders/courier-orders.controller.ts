import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { CourierHistoryQueryDto } from './dto/courier-history.query.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { OrdersService } from './orders.service';

/**
 * Courier-facing order endpoints. Mounted at /api/courier/orders/*.
 * The courier's id always comes from the JWT — never the URL or body — so
 * a courier can only ever see/modify their own orders. Foreign-order access
 * returns 404 (not 403) so existence stays hidden.
 *
 * Static routes (`/active`, `/history`) are declared before the `:id`
 * parameter route so Nest matches them first.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['courier'])
@Controller('courier/orders')
export class CourierOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('active')
  listActive(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.orders.listActive(requireUserId(user));
  }

  @Get('history')
  listHistory(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: CourierHistoryQueryDto,
  ) {
    return this.orders.listHistory(requireUserId(user), query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.findOneCourier(requireUserId(user), id);
  }

  @Put(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.orders.updateStatus(
      requireUserId(user),
      id,
      dto.status,
      dto.cancellationReason,
    );
  }
}

function requireUserId(user: AuthenticatedUser | undefined): string {
  if (!user) {
    throw new Error('Authenticated user missing on request');
  }
  return user.sub;
}
