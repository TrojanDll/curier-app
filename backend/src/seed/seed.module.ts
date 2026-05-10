import { Module } from '@nestjs/common';
import { AdminSeederService } from './admin-seeder.service';

/**
 * Bootstrap-time seeding hooks. Currently scoped to the first-admin auto-seed
 * (§14.2.11); add further seeders here as needed.
 *
 * PrismaModule + ConfigModule are global, so this module needs no imports.
 */
@Module({
  providers: [AdminSeederService],
})
export class SeedModule {}
