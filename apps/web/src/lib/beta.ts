/**
 * Beta invite cookie helpers. Edge-safe (Web Crypto only) because the
 * middleware verifies the cookie on every request in invite-only mode.
 *
 * Cookie value: `<code>.<expiresAtUnixSeconds>.<hmacHex>`
 */

export const BETA_COOKIE = "pb_beta";
/** Set alongside the httpOnly cookie so client UI can tell the visitor is invited. */
export const BETA_HINT_COOKIE = "pb_beta_hint";
/** Marks that the signed-in user's redemption has been recorded. */
export const BETA_OK_COOKIE = "pb_beta_ok";

export const BETA_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function secret(): string {
  const s = process.env.BETA_INVITE_SECRET || process.env.CLERK_SECRET_KEY;
  if (!s) throw new Error("BETA_INVITE_SECRET (or CLERK_SECRET_KEY) must be set");
  return s;
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signBetaCookie(code: string, maxAgeSeconds = BETA_COOKIE_MAX_AGE): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `${code}.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

/** Returns the invite code when the cookie is intact and unexpired, else null. */
export async function verifyBetaCookie(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [code, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!code || !Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const expected = await hmac(`${code}.${exp}`);
  if (expected.length !== sig.length) return null;
  // Constant-time compare.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? code : null;
}

export const betaCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: BETA_COOKIE_MAX_AGE,
};
