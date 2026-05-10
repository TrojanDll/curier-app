import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminStatisticsController } from './admin-statistics.controller';
import { CourierStatisticsController } from './courier-statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminStatisticsController, CourierStatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
