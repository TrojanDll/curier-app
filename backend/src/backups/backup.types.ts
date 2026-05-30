/**
 * Shared types + constants for the backup/restore subsystem.
 *
 * A backup is a single self-contained ZIP archive:
 *
 *   <id>.zip
 *   ├── manifest.json          — portable header (format version, counts, ...)
 *   ├── data/<table>.json      — one JSON array per backed-up table
 *   └── uploads/<orderId>/...   — courier photo files, mirrored from disk
 *
 * Backup *history* lives on disk, NOT in the database: each archive has a
 * sibling `<id>.meta.json` sidecar. This is deliberate — restoring a backup
 * wipes and reloads the DB tables, so storing history in the DB would erase
 * the very list the operator browses. The filesystem is the source of truth.
 */

/** Bump when the on-disk ZIP layout or backed-up table set changes incompatibly. */
export const BACKUP_FORMAT_VERSION = 1;

/**
 * Tables included in a backup, in *parent → child* insertion order (admins and
 * couriers must exist before orders that reference them; orders before their
 * photos). Restore deletes in the reverse order. `refresh_tokens` is excluded
 * on purpose: it is ephemeral auth state, security-sensitive, and meaningless
 * to restore — a restore instead wipes all sessions.
 */
export const BACKUP_TABLES = [
  'admins',
  'couriers',
  'orders',
  'order_photos',
  'app_settings',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupCounts {
  admins: number;
  couriers: number;
  orders: number;
  orderPhotos: number;
  appSettings: number;
}

/**
 * Embedded in the archive as `manifest.json`. Portable and deployment-agnostic
 * so a backup produced on one installation can be imported into another.
 */
export interface BackupManifest {
  formatVersion: number;
  /** ISO timestamp — when the data snapshot itself was taken. */
  createdAt: string;
  /** Stack version of the backend that produced the snapshot. */
  stackVersion: string;
  counts: BackupCounts;
  photoCount: number;
  photoBytes: number;
  /** Table dump file names present under `data/` (sans `.json`). */
  tables: readonly string[];
}

export type BackupOrigin = 'manual' | 'imported' | 'pre-restore';

/**
 * Sidecar metadata (`<id>.meta.json`) — the local history record. Superset of
 * the manifest plus deployment-local fields (origin, who triggered it, the file
 * name on disk). Drives the admin "история бэкапов" table.
 */
export interface BackupMeta {
  id: string;
  fileName: string;
  /** ISO — when this backup file appeared on THIS deployment (created/imported). */
  createdAt: string;
  /** ISO — `manifest.createdAt`; for imported backups this is the original snapshot moment. */
  contentCreatedAt: string;
  sizeBytes: number;
  formatVersion: number;
  stackVersion: string;
  counts: BackupCounts;
  photoCount: number;
  photoBytes: number;
  origin: BackupOrigin;
  /** Admin username that triggered it, or `system` for automatic snapshots. */
  createdBy: string | null;
  note: string | null;
}

export interface RestoreResult {
  restored: true;
  /** Backup id that was restored. */
  restoredFrom: string;
  /** Auto snapshot taken right before wiping — lets the operator undo the restore. */
  safetySnapshotId: string;
  counts: BackupCounts;
}
