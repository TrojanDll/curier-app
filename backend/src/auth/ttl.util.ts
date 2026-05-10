/**
 * Parse a TTL string ("30s" / "15m" / "2h" / "30d") into milliseconds.
 * Used for both JWT access-token signing and refresh-token expiry.
 *
 * We avoid the `ms` package's `StringValue` literal type — it forces every
 * caller to assert non-empty string literals, which doesn't compose with
 * runtime-loaded ConfigService values.
 */
export function parseTtlMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new Error(`Invalid TTL value: ${ttl}`);
  }
  const value = Number(match[1]);
  switch (match[2]) {
    case 's':
      return value * 1_000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      throw new Error(`Invalid TTL unit: ${match[2]}`);
  }
}

/** Same as {@link parseTtlMs} but returns whole seconds. */
export function parseTtlSec(ttl: string): number {
  return Math.floor(parseTtlMs(ttl) / 1_000);
}
