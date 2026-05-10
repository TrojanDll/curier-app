import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { parseTtlSec } from './ttl.util';

/**
 * AuthModule wires JWT signing (access tokens) and Passport's `'jwt'` strategy.
 * Refresh tokens live in Postgres via PrismaService — see AuthService.
 *
 * Guards are exported so feature modules can `@UseGuards(JwtAuthGuard, RolesGuard)`
 * without re-providing them.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // expiresIn is given in seconds (number) so we don't depend on the
      // `ms` package's `StringValue` literal type, which doesn't accept
      // dynamic strings from ConfigService.
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseTtlSec(config.getOrThrow<string>('JWT_ACCESS_TTL')),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  // JwtModule is re-exported so RealtimeGateway (2.9) can verify access
  // tokens during Socket.IO handshake without re-registering the secret.
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
