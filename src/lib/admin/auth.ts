import "server-only";
import { ObjectId } from "mongodb";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE } from "./cookie";
import { dummyHash, newToken, sameSecret, tokenHash, verifyPassword } from "./crypto";
import { database, dbReady } from "@/lib/leads/db";

/*
 * Who may use /admin. There is no sign-up page: an admin is set by ADMIN_EMAIL and ADMIN_PASSWORD on the server, or
 * created from the command line (scripts/admin.mjs). Signing in takes an email and a password.
 *
 * Defences, in the order a request meets them:
 *  - proxy.ts sends anyone without a session cookie to the sign-in page, and sets a strict CSP and no-store headers.
 *  - every admin page and server action calls requireAdmin(), which checks the session against the database (the
 *    proxy only looks for a cookie, so it is never the only check).
 *  - the cookie is __Host- prefixed, httpOnly, Secure and SameSite=Strict; it carries a random token, and the database
 *    keeps only its SHA-256, so a copy of the database can't be used to sign in.
 *  - sessions end after 2 idle hours or 12 hours in all, and can be ended from /admin/security or the CLI.
 *  - 5 wrong sign-ins for an email or 20 from an address within 15 minutes lock further tries for that window.
 *  - every sign-in (right or wrong) and every change is written to the audit log.
 */

export type Admin = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  disabled: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
};

export type Session = {
  _id: ObjectId;
  tokenHash: string;
  adminId: ObjectId;
  createdAt: Date;
  lastSeenAt: Date;
  /** Hard end: 12 hours after sign-in. The TTL index deletes the record then. */
  expiresAt: Date;
  /** Soft end: 2 hours after the last request. */
  idleUntil: Date;
  ip: string | null;
  country: string | null;
  userAgent: string;
};

type Attempt = { key: string; at: Date };
export type AuditEntry = {
  _id?: ObjectId;
  at: Date;
  adminId: ObjectId | null;
  email: string;
  action: string;
  ref?: string;
  detail?: string;
  ip: string | null;
};

const db = () => database();
export const admins = () => db().collection<Admin>("admins");
export const sessions = () => db().collection<Session>("admin_sessions");
const attempts = () => db().collection<Attempt>("admin_attempts");
export const auditLog = () => db().collection<AuditEntry>("admin_audit");

const MIN = 60_000;
const HOUR = 60 * MIN;
export const ABSOLUTE = 12 * HOUR;
export const IDLE = 2 * HOUR;
const WINDOW = 15 * MIN;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

/** Where the request came from, for rate limits, the audit log and the session list. Vercel sets x-real-ip. */
export async function requestInfo() {
  const h = await headers();
  return {
    ip: h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    country: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry"),
    userAgent: (h.get("user-agent") ?? "").slice(0, 300),
  };
}

export async function audit(entry: Omit<AuditEntry, "at" | "ip">, ip?: string | null) {
  await auditLog().insertOne({
    at: new Date(),
    ip: ip ?? (await requestInfo()).ip,
    ...entry,
  });
}

export type SignIn = { ok: true } | { ok: false; error: string };
const WRONG = "That email or password isn't right.";

/** The admin set by ADMIN_EMAIL and ADMIN_PASSWORD on this server, if both are. Trimmed: a pasted value often has a stray space. */
function matchesEnvAdmin(email: string, password: string) {
  const wantEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const wantPassword = process.env.ADMIN_PASSWORD?.trim();
  return !!wantEmail && !!wantPassword && email === wantEmail && sameSecret(password, wantPassword);
}

/** Checks the email and password and, when they pass, starts a session and sets its cookie. Server actions only. */
export async function signIn(emailIn: string, password: string): Promise<SignIn> {
  if (!dbReady())
    return {
      ok: false,
      error: "Sign-in isn't available: this server has no database connected (MONGODB_URI).",
    };
  const email = emailIn.trim().toLowerCase().slice(0, 200);
  const req = await requestInfo();
  const since = new Date(Date.now() - WINDOW);
  const [byEmail, byIp] = await Promise.all([
    attempts().countDocuments({ key: `email:${email}`, at: { $gt: since } }),
    req.ip ? attempts().countDocuments({ key: `ip:${req.ip}`, at: { $gt: since } }) : 0,
  ]);
  if (byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP) {
    await audit({ adminId: null, email, action: "sign_in_locked" }, req.ip);
    return {
      ok: false,
      error: "Too many tries. Wait 15 minutes, then try again.",
    };
  }

  let admin = await admins().findOne({ email });
  // the same work whether or not the email exists, so timing doesn't reveal which emails are admins
  const hashOk = await verifyPassword(password, admin?.passwordHash || (await dummyHash()));
  const envOk = matchesEnvAdmin(email, password);
  const passwordOk = hashOk || envOk;
  // sessions belong to a record in the database, so the admin from the environment gets one on first sign-in
  if (envOk && !admin) {
    admin = await admins().findOneAndUpdate(
      { email },
      { $setOnInsert: { name: "Chime Long admin", passwordHash: "", disabled: false, createdAt: new Date(), lastLoginAt: null } },
      { upsert: true, returnDocument: "after" },
    );
  }

  if (!admin || !passwordOk || admin.disabled) {
    await attempts().insertMany([{ key: `email:${email}`, at: new Date() }, ...(req.ip ? [{ key: `ip:${req.ip}`, at: new Date() }] : [])]);
    await audit(
      {
        adminId: admin?._id ?? null,
        email,
        action: "sign_in_failed",
        detail: !admin ? "unknown email" : !passwordOk ? "password" : "disabled",
      },
      req.ip,
    );
    return { ok: false, error: WRONG };
  }

  await admins().updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  await attempts().deleteMany({ key: `email:${email}` });
  const token = newToken();
  const now = new Date();
  await sessions().insertOne({
    _id: new ObjectId(),
    tokenHash: tokenHash(token),
    adminId: admin._id,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + ABSOLUTE),
    idleUntil: new Date(now.getTime() + IDLE),
    ...req,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ABSOLUTE / 1000,
  });
  await audit({ adminId: admin._id, email, action: "sign_in" }, req.ip);
  return { ok: true };
}

/**
 * The signed-in admin and their session, checked against the database: once per request (cache), however many
 * components ask. Null when there is no valid session. Moves the idle deadline along at most every 5 minutes.
 */
export const currentAdmin = cache(async (): Promise<{ admin: Admin; session: Session } | null> => {
  if (!dbReady()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await sessions().findOne({ tokenHash: tokenHash(token) });
  const now = Date.now();
  if (!session || session.expiresAt.getTime() <= now || session.idleUntil.getTime() <= now) return null;
  const admin = await admins().findOne({
    _id: session.adminId,
    disabled: false,
  });
  if (!admin) return null;
  if (now - session.lastSeenAt.getTime() > 5 * MIN) {
    const idleUntil = new Date(Math.min(now + IDLE, session.expiresAt.getTime()));
    await sessions().updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date(now), idleUntil } });
  }
  return { admin, session };
});

/** For every admin page and server action: the admin, or off to the sign-in page. */
export async function requireAdmin() {
  const who = await currentAdmin();
  if (!who) redirect("/admin/login");
  return who;
}

/** Ends this session (server side too: a copied cookie stops working) and clears the cookie. Server actions only. */
export async function signOut() {
  const who = await currentAdmin();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && dbReady()) await sessions().deleteOne({ tokenHash: tokenHash(token) });
  jar.delete(SESSION_COOKIE);
  if (who)
    await audit({
      adminId: who.admin._id,
      email: who.admin.email,
      action: "sign_out",
    });
}
