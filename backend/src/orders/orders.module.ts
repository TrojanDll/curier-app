import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminOrdersController } from './admin-orders.controller';
import { CourierOrdersController } from './courier-orders.controller';
import { OrdersService } from './orders.service';

/**
 * OrdersModule — admin CRUD + courier status flow.
 *
 * AuthModule is imported so JwtAuthGuard / RolesGuard are resolvable in this
 * module's DI context. PrismaService is global.
 *
 * OrdersService is exported because the auto-assign service (Stage 2.6) and
 * StatisticsModule (2.8) both reach into orders without re-querying.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminOrdersController, CourierOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
