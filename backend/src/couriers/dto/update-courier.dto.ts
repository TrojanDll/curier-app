/**
 * Body for `PATCH /api/admin/couriers/:id`. Every field is optional; only
 * fields present in the request body are touched. Sending `email: null`
 * clears the value, omitting `email` leaves it as-is.
 */
export class UpdateCourierDto {
  username?: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
}
