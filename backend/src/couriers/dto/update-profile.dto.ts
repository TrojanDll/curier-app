/**
 * Body for `PUT /api/courier/profile`. Couriers can only edit their own
 * email and phone — username, full name, dob etc. are admin-only.
 */
export class UpdateProfileDto {
  email?: string | null;
  phone?: string | null;
}
