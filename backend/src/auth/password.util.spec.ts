import { comparePassword, hashPassword } from './password.util';

/**
 * Sanity coverage for the auth password util (§14.7.2). bcrypt itself is well
 * tested upstream — these specs lock in the *contract* we depend on:
 * - hashPassword produces a non-empty string distinct from the plaintext;
 * - hashPassword is non-deterministic (different salt every call);
 * - comparePassword round-trips truthy for the matching pair and false for
 *   the mismatching one;
 * - the algorithm identifier in the hash starts with `$2`, so a future swap
 *   (e.g. argon2) would surface as a failing test here, prompting an
 *   intentional re-stamping decision rather than silent migration.
 */
describe('password.util', () => {
  // bcrypt timing on commodity hardware: ~80ms at rounds=10. Across the four
  // hashing-touch specs below we're around 400ms — well under the default
  // Jest 5s timeout, so no per-test override needed.

  describe('hashPassword', () => {
    it('produces a non-empty hash distinct from the plaintext', async () => {
      const hash = await hashPassword('hunter2');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('hunter2');
      expect(hash.length).toBeGreaterThan(40);
    });

    it('emits the bcrypt $2 algorithm identifier', async () => {
      // Locking the algorithm prefix on purpose — if anyone swaps bcrypt for
      // argon2 / scrypt, this test forces them to think about re-hashing
      // existing rows rather than silently mixing schemes in the table.
      const hash = await hashPassword('hunter2');
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('returns different hashes for the same plaintext (random salt)', async () => {
      const a = await hashPassword('hunter2');
      const b = await hashPassword('hunter2');
      expect(a).not.toBe(b);
    });
  });

  describe('comparePassword', () => {
    it('round-trips true for the matching pair', async () => {
      const hash = await hashPassword('correct horse battery staple');
      await expect(
        comparePassword('correct horse battery staple', hash),
      ).resolves.toBe(true);
    });

    it('returns false for the wrong plaintext', async () => {
      const hash = await hashPassword('correct horse battery staple');
      await expect(comparePassword('something else', hash)).resolves.toBe(
        false,
      );
    });

    it('returns false for an empty plaintext against a real hash', async () => {
      const hash = await hashPassword('correct horse battery staple');
      await expect(comparePassword('', hash)).resolves.toBe(false);
    });
  });
});
