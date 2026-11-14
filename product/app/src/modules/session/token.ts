import { createHash, randomBytes } from "node:crypto";

/**
 * Session tokens: 32 random bytes (256 bits), base64url → 43 characters.
 * The raw token only ever lives in the user's cookie and resume link; the DB stores sha256(token).
 */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** Cheap format check so malformed input never reaches the database. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}
