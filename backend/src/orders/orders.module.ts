import { Module } from '@nestjs/common';
import { AssignmentModule } from '../assignment/assignment.module';
import { AuthModule } from '../auth/auth.module';
import { PhotosModule } from '../photos/photos.module';
import { AdminOrdersController } from './admin-orders.controller';
import { CourierOrdersController } from './courier-orders.controller';
import { OrdersService } from './orders.service';

/**
 * OrdersModule — admin CRUD + courier status flow.
 *
 * AuthModule is imported so JwtAuthGuard / RolesGuard are resolvable in this
 * module's DI context. PrismaService is global.
 *
 * AssignmentModule is imported because OrdersService triggers auto-assign on
 * order create and queue-drain on `returned` (Stage 2.6, §8 of the plan).
 *
 * PhotosModule is imported so OrdersService can embed photo metadata into
 * order detail responses (Stage 2.7).
 *
 * OrdersService is exported because StatisticsModule (2.8) will reach into
 * orders without re-querying.
 */
@Module({
  imports: [AuthModule, AssignmentModule, PhotosModule],
  controllers: [AdminOrdersController, CourierOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
