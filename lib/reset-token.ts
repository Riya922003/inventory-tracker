import crypto from "crypto";

// Reset tokens are emailed to the user in plaintext but stored hashed, so a
// database leak alone can't be used to reset anyone's password.
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
