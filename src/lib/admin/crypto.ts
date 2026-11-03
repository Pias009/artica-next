import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/*
 * The admin panel's cryptography, all from node:crypto: password hashes (scrypt), authenticator codes (TOTP, RFC 6238),
 * secrets sealed at rest (AES-256-GCM) and session tokens. No "@/" imports and no Next.js, so scripts/admin.mjs and
 * `node --test` load it as is.
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

/* ---- Authenticator codes: TOTP, SHA-1, 6 digits, 30 seconds ---- */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function fromBase32(text: string) {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("not base32");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 20 random bytes, the size RFC 4226 recommends, as base32 for authenticator apps. */
export const newTotpSecret = () => base32(randomBytes(20));

export const STEP = 30;
export const stepAt = (ms: number) => Math.floor(ms / 1000 / STEP);

export function totp(secret: string, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", fromBase32(secret)).update(counter).digest();
  const off = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(off) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/**
 * The time step the code belongs to, if it is right for now (one step either side, for clock drift) and newer than
 * `lastStep`, the last code this admin used: a code works once, so one seen over a shoulder or in a log can't be
 * replayed. Null otherwise.
 */
export function verifyTotp(secret: string, code: string, now = Date.now(), lastStep = -1): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const at = stepAt(now);
  for (const step of [at - 1, at, at + 1]) {
    if (step <= lastStep) continue;
    if (timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code))) return step;
  }
  return null;
}

export const otpauthUrl = (account: string, secret: string, issuer = "Chime Long admin") =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP}`;

/* ---- Secrets at rest: AES-256-GCM under ADMIN_ENC_KEY, so a copy of the database alone can't make codes ---- */

function keyFrom(b64: string | undefined) {
  const key = Buffer.from(b64 ?? "", "base64");
  if (key.length !== 32) throw new Error("ADMIN_ENC_KEY must be 32 bytes, base64 (openssl rand -base64 32)");
  return key;
}

export function seal(plain: string, keyB64: string | undefined) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyFrom(keyB64), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function open(sealed: string, keyB64: string | undefined) {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !body) throw new Error("not a sealed value");
  const d = createDecipheriv("aes-256-gcm", keyFrom(keyB64), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

/* ---- Session tokens: the cookie holds the token, the database only its hash ---- */

export const newToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
