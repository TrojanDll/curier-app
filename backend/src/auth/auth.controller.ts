import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { AuthenticatedUser } from './types/jwt-payload';

/**
 * Auth endpoints (§5 of completion_plan.md). Mounted under `/api/auth/*`
 * thanks to `app.setGlobalPrefix('api')` in main.ts.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  loginAdmin(@Body() dto: LoginDto) {
    return this.authService.loginAdmin(dto.username, dto.password);
  }

  @Post('courier/login')
  @HttpCode(HttpStatus.OK)
  loginCourier(@Body() dto: LoginDto) {
    return this.authService.loginCourier(dto.username, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  /**
   * Self-service password change for the currently authenticated admin
   * (§14.3.6). 204 on success; revokes all refresh tokens for this admin so
   * other sessions must re-login. See AuthService.changeAdminPassword.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @Post('admin/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeAdminPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changeAdminPassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
