/**
 * Sets up (or brings up to date) the inquiry pipeline's collections in MongoDB: a validator that refuses malformed
 * inquiries, and the indexes the site relies on (unique refs and idempotency keys, the outbox and digest queries).
 *
 *   npm run db:migrate          (reads .env.local)
 *
 * Safe to run again: existing collections get the current validator, existing indexes are left as they are.
 */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI in .env.local");
const dbName = process.env.MONGODB_DB || "chimelong";

const STATUS = ["new", "replied", "quoted", "won", "lost", "spam"];
const INTENT = ["quote", "sample", "visit", "private_label", "shipping"];
const mail = {
  bsonType: "object",
  required: ["attempts", "nextAt", "sentAt", "lastError"],
  properties: { attempts: { bsonType: "int", minimum: 0 }, nextAt: { bsonType: "date" }, sentAt: { bsonType: ["date", "null"] } },
};

/** Mirrors src/lib/leads/db.ts (InquiryDoc) and the limits in src/app/actions.ts. */
const inquiryValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["ref", "idempotencyKey", "createdAt", "company", "email", "country", "buyerType", "intent", "note", "lines", "pairs", "status", "statusAt", "mail"],
    properties: {
      ref: { bsonType: "string", pattern: "^CL-[0-9]{4}-[0-9]{4,}$" },
      idempotencyKey: { bsonType: "string", minLength: 36, maxLength: 36 },
      createdAt: { bsonType: "date" },
      company: { bsonType: "string", minLength: 1, maxLength: 200 },
      email: { bsonType: "string", maxLength: 200 },
      country: { bsonType: "string", maxLength: 80 },
      buyerType: { bsonType: "string", maxLength: 40 },
      intent: { enum: INTENT },
      note: { bsonType: "string", maxLength: 4000 },
      pairs: { bsonType: ["int", "long"], minimum: 0 },
      lines: {
        bsonType: "array",
        maxItems: 200,
        items: {
          bsonType: "object",
          required: ["productId", "name", "color", "sizes", "cases", "pairs"],
          properties: { productId: { bsonType: "string" }, cases: { bsonType: "int", minimum: 1 }, pairs: { bsonType: "int", minimum: 1 } },
        },
      },
      status: { enum: STATUS },
      statusAt: { bsonType: "date" },
      firstReplyAt: { bsonType: ["date", "null"] },
      mail: { bsonType: "object", required: ["notify_desk", "confirm_buyer"], properties: { notify_desk: mail, confirm_buyer: mail } },
    },
  },
};

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
try {
  const db = client.db(dbName);
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  if (existing.has("inquiries")) await db.command({ collMod: "inquiries", validator: inquiryValidator, validationLevel: "strict" });
  else await db.createCollection("inquiries", { validator: inquiryValidator, validationLevel: "strict" });
  if (!existing.has("counters")) await db.createCollection("counters");

  const made = await db.collection("inquiries").createIndexes([
    { key: { ref: 1 }, name: "ref_unique", unique: true },
    { key: { idempotencyKey: 1 }, name: "idempotency_unique", unique: true },
    // the daily digest and the desk's status reports
    { key: { status: 1, createdAt: 1 }, name: "status_created" },
    // finding a buyer's inquiries (requests to see or delete their data)
    { key: { email: 1 }, name: "email", collation: { locale: "en", strength: 2 } },
    // the outbox: unsent emails that are due
    { key: { "mail.notify_desk.sentAt": 1, "mail.notify_desk.nextAt": 1 }, name: "outbox_desk" },
    { key: { "mail.confirm_buyer.sentAt": 1, "mail.confirm_buyer.nextAt": 1 }, name: "outbox_buyer" },
  ]);
  // the admin panel (src/lib/admin/auth.ts); admins are made with `npm run admin`
  await db.collection("admins").createIndex({ email: 1 }, { name: "email_unique", unique: true });
  await db.collection("admin_sessions").createIndexes([
    { key: { tokenHash: 1 }, name: "token_unique", unique: true },
    { key: { adminId: 1 }, name: "admin" },
    // gone the moment they expire
    { key: { expiresAt: 1 }, name: "expire", expireAfterSeconds: 0 },
  ]);
  await db.collection("admin_attempts").createIndexes([
    { key: { key: 1, at: 1 }, name: "key_at" },
    { key: { at: 1 }, name: "expire", expireAfterSeconds: 24 * 60 * 60 },
  ]);
  await db.collection("admin_audit").createIndexes([
    { key: { ref: 1, at: -1 }, name: "ref_at" },
    // a year of history
    { key: { at: 1 }, name: "expire", expireAfterSeconds: 365 * 24 * 60 * 60 },
  ]);
  // the assistant's rate limit (src/lib/assistant/limit.ts): counts by address, gone after a day
  await db.collection("assistant_hits").createIndexes([
    { key: { key: 1, at: 1 }, name: "key_at" },
    { key: { at: 1 }, name: "expire", expireAfterSeconds: 24 * 60 * 60 },
  ]);
  // the visitor log (src/lib/analytics/visits.ts): 90 days, no IP addresses
  await db.collection("visits").createIndexes([
    { key: { at: 1 }, name: "expire", expireAfterSeconds: 90 * 24 * 60 * 60 },
    { key: { sid: 1, at: 1 }, name: "sid_at" },
    { key: { kind: 1, at: -1 }, name: "kind_at" },
  ]);
  // the marketing desk (src/lib/marketing/store.ts): subscribers with SUB- ids, the mail schedule, the ideas board
  await db.collection("subscribers").createIndexes([
    { key: { email: 1 }, name: "email_unique", unique: true },
    { key: { sid: 1 }, name: "sid_unique", unique: true },
    { key: { status: 1, priority: 1, seq: 1 }, name: "audience" },
    { key: { createdAt: -1 }, name: "created" },
  ]);
  await db.collection("mail_campaigns").createIndexes([{ key: { status: 1, scheduledAt: 1 }, name: "due" }]);
  await db.collection("marketing_ideas").createIndexes([{ key: { stage: 1, updatedAt: -1 }, name: "board" }]);
  // the admin panel's site edits (src/lib/content): one document, nothing to index
  console.log(`Database "${dbName}" ready: inquiries (validator + ${made.length} indexes), counters, admins, admin_sessions, admin_attempts, admin_audit, subscribers, mail_campaigns, marketing_ideas`);
} finally {
  await client.close();
}
