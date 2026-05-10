/**
 * Body for `POST /api/admin/orders/:id/reassign`. The admin picks the target
 * courier; OrdersService validates the courier is active and not paused so
 * pause/disable cannot be bypassed via reassignment.
 */
export class ReassignOrderDto {
  courierId!: string;
}
