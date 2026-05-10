import { Module } from '@nestjs/common';
import { AssignmentModule } from '../assignment/assignment.module';
import { AuthModule } from '../auth/auth.module';
import { AdminCouriersController } from './admin-couriers.controller';
import { CourierProfileController } from './courier-profile.controller';
import { CouriersService } from './couriers.service';

/**
 * CouriersModule — admin CRUD + courier self-service profile.
 *
 * AuthModule is imported so JwtAuthGuard / RolesGuard are resolvable in this
 * module's DI context (they're declared as providers in AuthModule).
 *
 * AssignmentModule is imported because CouriersService.resume triggers a
 * queue-drain pass for the just-resumed courier (Stage 2.6, §8).
 *
 * CouriersService is exported because OrdersModule (2.5) and StatisticsModule
 * (2.8) look up couriers without re-querying.
 */
@Module({
  imports: [AuthModule, AssignmentModule],
  controllers: [AdminCouriersController, CourierProfileController],
  providers: [CouriersService],
  exports: [CouriersService],
})
export class CouriersModule {}
