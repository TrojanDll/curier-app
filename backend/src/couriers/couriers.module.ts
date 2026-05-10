import { Module } from '@nestjs/common';
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
 * CouriersService is exported because OrdersModule (Stage 2.5) and the
 * auto-assign service (2.6) need to look up couriers without re-querying.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminCouriersController, CourierProfileController],
  providers: [CouriersService],
  exports: [CouriersService],
})
export class CouriersModule {}
