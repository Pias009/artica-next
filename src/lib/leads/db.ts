import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type ObjectId } from "mongodb";
import type { Details, Inquiry } from "./mail";

/**
 * The leads database: MongoDB Atlas at MONGODB_URI (database MONGODB_DB, default "chimelong"). The client is made on
 * first use, not at import, so `next build` and demo setups without a database still work: `dbReady()` is false and
 * the inquiry pipeline falls back to sending email directly. One client per function instance, shared across requests
 * (and across dev reloads through globalThis); attachDatabasePool lets Vercel close idle connections before the
 * instance is suspended. Collections and indexes: scripts/migrate.mjs.
 */
const g = globalThis as typeof globalThis & { leadsMongo?: MongoClient };

export const dbReady = () => !!process.env.MONGODB_URI;

function client() {
  if (!g.leadsMongo) {
    const c = new MongoClient(process.env.MONGODB_URI!, {
      appName: "chime-long-site",
      // fail fast: past this the inquiry goes straight to the desk by email instead
      serverSelectionTimeoutMS: 3500,
      maxIdleTimeMS: 10_000,
    });
    // A closed client can't be used again ("MongoTopologyClosedError: Topology is closed"). attachDatabasePool closes
    // it when the instance goes idle, and Fluid compute then reuses the instance, so forget it once it closes and the
    // next request makes a fresh one instead of failing (this broke admin sign-in on Vercel).
    c.on("topologyClosed", () => {
      if (g.leadsMongo === c) g.leadsMongo = undefined;
    });
    g.leadsMongo = c;
    attachDatabasePool(c);
  }
  return g.leadsMongo;
}

export type MailKind = "notify_desk" | "confirm_buyer";
export const MAIL_KINDS: MailKind[] = ["notify_desk", "confirm_buyer"];

/** One email still to send (or sent), kept on its inquiry so both are written in the same insert. */
export type MailState = { attempts: number; nextAt: Date; sentAt: Date | null; lastError: string | null };

export type Status = "new" | "replied" | "quoted" | "won" | "lost" | "spam";

/** An inquiry as stored: the form's content (lines are snapshots of the styles as they were), context and workflow. */
export type InquiryDoc = Omit<Inquiry, "ref"> & {
  _id?: ObjectId;
  ref: string;
  idempotencyKey: string;
  createdAt: Date;
  /** Context for reporting; no IP address is stored. */
  ipCountry: string | null;
  season: string | null;
  sourcePath: string | null;
  status: Status;
  statusAt: Date;
  firstReplyAt: Date | null;
  mail: Record<MailKind, MailState>;
  /** For an email request: the details the desk prepared and, once sent, when, by whom, or why it failed. */
  details?: Details & { savedAt: Date; sentAt: Date | null; sentBy: string | null; lastError: string | null };
};

export const database = () => client().db(process.env.MONGODB_DB || "chimelong");
export const inquiries = () => database().collection<InquiryDoc>("inquiries");
/** Per-year sequences for the CL-2026-0142 references. */
export const counters = () => database().collection<{ _id: string; seq: number }>("counters");
