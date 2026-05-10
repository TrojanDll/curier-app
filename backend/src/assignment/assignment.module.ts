import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';

/**
 * AssignmentModule — auto-assign + queue drainer (Stage 2.6).
 *
 * No controllers: `AssignmentService` is invoked from `OrdersService.create`
 * (new-order trigger), `OrdersService.updateStatus` on `returned` (drainer
 * trigger), and `CouriersService.resume` (drainer trigger).
 *
 * PrismaService is global, so no extra imports are needed here.
 */
@Module({
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
