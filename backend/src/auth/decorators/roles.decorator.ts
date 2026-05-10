import { Reflector } from '@nestjs/core';
import type { Role } from '../types/jwt-payload';

/**
 * Annotates a controller/handler with the roles allowed to access it.
 * Read by {@link RolesGuard}.
 *
 * @example
 *   @Roles(['admin'])
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Get('couriers')
 *   listCouriers() { ... }
 */
export const Roles = Reflector.createDecorator<Role[]>();
