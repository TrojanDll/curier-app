/**
 * Body for `POST /api/admin/couriers`. class-validator wiring lands in 2.14.
 * dateOfBirth is an ISO date string ("YYYY-MM-DD") because JSON has no date type.
 */
export class CreateCourierDto {
  username!: string;
  password!: string;
  fullName!: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
}
