import {
  Body,
  Controller,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { ReassignOrderDto } from './dto/reassign-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

/**
 * Admin-only order management. Mounted at /api/admin/orders/*.
 *
 * `POST /admin/orders` creates with `status='new'` and `courierId=null` —
 * auto-assign lands in Stage 2.6 and will run on the same record.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.list(query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.create(requireUserId(user), dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOneAdmin(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(id, dto);
  }

  @Post(':id/reassign')
  @HttpCode(HttpStatus.OK)
  reassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignOrderDto,
  ) {
    return this.orders.reassign(id, dto.courierId);
  }
}

function requireUserId(user: AuthenticatedUser | undefined): string {
  if (!user) {
    throw new Error('Authenticated user missing on request');
  }
  return user.sub;
}
