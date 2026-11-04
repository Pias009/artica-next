import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/*
 * The admin panel's cryptography, all from node:crypto: password hashes (scrypt) and session tokens. No "@/" imports
 * and no Next.js, so scripts/admin.mjs and `node --test` load it as is.
 */

/* ---- Passwords: scrypt, N = 2^15 (about 32 MB and ~100 ms per check, so guessing offline is slow) ---- */

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;
export const MIN_PASSWORD = 14;

const derive = (password: string, salt: Buffer, o: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password.normalize("NFKC"), salt, KEYLEN, o, (e, key) => (e ? reject(e) : resolve(key))));

/** "scrypt$15$8$1$<salt>$<hash>": the cost travels with the hash, so it can be raised later without breaking old ones. */
export async function hashPassword(password: string) {
  if (password.length < MIN_PASSWORD) throw new Error(`Passwords need at least ${MIN_PASSWORD} characters`);
  const salt = randomBytes(16);
  const key = await derive(password, salt, SCRYPT);
  return ["scrypt", Math.log2(SCRYPT.N), SCRYPT.r, SCRYPT.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, logN, r, p, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = await derive(password, Buffer.from(salt, "base64url"), {
    N: 2 ** Number(logN),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Checked against when the email is unknown, so a wrong email takes as long as a wrong password. */
let dummy: Promise<string> | null = null;
export const dummyHash = () => (dummy ??= hashPassword(randomBytes(24).toString("base64url")));

/** A strong password for a new admin: 24 characters from a 64-letter alphabet (144 bits). */
export const newPassword = () => randomBytes(18).toString("base64url");

/* ---- Session tokens: the cookie holds the token, the database only its hash ---- */

export const newToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
