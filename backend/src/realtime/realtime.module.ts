import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';

/**
 * RealtimeModule — Socket.IO gateway for live admin/courier updates
 * (Stage 2.9, §9 of completion_plan.md).
 *
 * AuthModule is imported (and re-exports JwtModule) so JwtService is
 * resolvable inside the gateway for handshake verification.
 *
 * RealtimeGateway is exported so feature services (Orders, Couriers,
 * future ones) can inject it and call `emit*` after their write paths.
 */
@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
