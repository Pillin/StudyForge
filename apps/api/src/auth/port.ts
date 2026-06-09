/**
 * AuthPort — the replaceable authentication boundary (Principle VI / FR-003).
 * The rest of the app depends on this interface, not on any provider. v1 ships
 * a D1 session-stub (session.ts); WorkOS etc. can implement the same port later.
 */
export interface AuthPort {
  signup(email: string, password: string): Promise<{ userId: string; token: string }>;
  login(email: string, password: string): Promise<{ userId: string; token: string }>;
  logout(token: string): Promise<void>;
  /** Returns the userId for a valid session token, or null. */
  verify(token: string): Promise<string | null>;
}

export class AuthError extends Error {
  constructor(
    public code: "EMAIL_TAKEN" | "INVALID_CREDENTIALS",
    message: string,
  ) {
    super(message);
  }
}
