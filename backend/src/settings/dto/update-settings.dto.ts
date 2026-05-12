import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Body for `PATCH /api/admin/settings`. All fields optional — the UI may
 * submit only the tunables that changed. Matches the schema in `AppSettings`;
 * add a new optional field here when introducing another runtime tunable.
 *
 * `supportContact` is nullable: sending `null` clears it (matches the
 * `UpdateCourierDto.email` clear-PATCH convention). `@IsOptional` short-
 * circuits both `null` and `undefined` before `@IsString` runs.
 */
export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  photoTtlDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  supportContact?: string | null;
}
