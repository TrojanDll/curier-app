import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { CouriersService } from './couriers.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Courier self-service profile. Mounted at /api/courier/profile.
 * The courier's own id always comes from the JWT — never trusted from the
 * URL or body — so a courier can only ever read/edit their own record.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['courier'])
@Controller('courier/profile')
export class CourierProfileController {
  constructor(private readonly couriers: CouriersService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.couriers.getProfile(requireUserId(user));
  }

  @Put()
  updateProfile(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.couriers.updateProfile(requireUserId(user), dto);
  }
}

/** JwtAuthGuard guarantees `user` is present, but the param decorator is
 *  typed as `| undefined`. Narrow at the controller boundary. */
function requireUserId(user: AuthenticatedUser | undefined): string {
  if (!user) {
    throw new Error('Authenticated user missing on request');
  }
  return user.sub;
}
