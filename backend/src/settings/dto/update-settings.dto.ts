import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Body for `PATCH /api/admin/settings`. All fields optional — the UI may
 * submit only the tunables that changed. Matches the schema in `AppSettings`;
 * add a new optional field here when introducing another runtime tunable.
 */
export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  photoTtlDays?: number;
}
