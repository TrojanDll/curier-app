import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `POST /api/admin/backups`. `note` is an optional free-form label
 * shown in the history table (e.g. "перед обновлением"). Everything else about
 * the snapshot is derived server-side.
 */
export class CreateBackupDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
