/**
 * Auth role mirrors `UserType` enum but stays as a string-literal union so
 * controllers/guards can avoid pulling in the generated Prisma client just to
 * read a JWT payload.
 */
export type Role = 'admin' | 'courier';

/** Shape of the signed JWT payload. */
export interface JwtPayload {
  sub: string;
  role: Role;
}

/** What `JwtStrategy.validate()` attaches to `req.user`. */
export interface AuthenticatedUser {
  sub: string;
  role: Role;
}
