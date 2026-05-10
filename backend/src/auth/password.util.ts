import * as bcrypt from 'bcrypt';

/**
 * Single source of truth for the bcrypt cost factor. 10 is the common default —
 * fast enough for interactive logins, slow enough to make brute-force costly.
 */
const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
