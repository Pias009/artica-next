# System design: inquiry lead pipeline

**Status:** Implemented. Rollout steps 1–6 and 8 are done; step 7 (BotID) is not. · **Date:** 2026-10-28 · **Related:** [ADR-0001 client store design](../adr/0001-client-store-design.md)

> **Database: MongoDB Atlas, not Postgres (changed 2026-10-28 at the owner's request).** Sections 3–4 below still describe the Postgres version; the design carries over like this:
> - **One `inquiries` document per inquiry**, with its line snapshots and both pending emails embedded (`mail.notify_desk`, `mail.confirm_buyer`). A single-document insert is atomic, so the outbox needs no transaction.
> - **Refs** come from a per-year counter document (`counters`, `$inc`). **Idempotency** comes from a unique index on `idempotencyKey`. **Claiming an email** is one `findOneAndUpdate` that increments `attempts` and pushes `nextAt` back with exponential backoff, using an update pipeline.
> - **`scripts/migrate.mjs`** sets a `$jsonSchema` validator (required fields, enums, length limits) and the indexes.
> - **Verified against the live Atlas cluster** (MongoDB 8.0) on a throwaway database: idempotent and concurrent repeats, the validator, draining by ref, backoff (1 → 2 min), concurrent drains, give-up and stuck rows, the status workflow, the purge, and the desk link served by `next start`.
>
> **How the build differs from this design** (code in `src/lib/leads/`, `src/app/actions.ts`, `src/app/api/cron/`, `src/app/desk/`):
> - **Refs can have gaps.** A repeated submit that races the first one uses up a number, so refs are unique but aren't a count.
> - **Claiming an email pushes back its next attempt time** (a lease), so no lock is held while the email sends.
> - **Crons.** Only `/api/cron/daily` is scheduled (Hobby plans allow daily crons only). It drains the outbox, sends the digest and purges spam. `/api/cron/outbox` exists for a 10-minute schedule on Pro. New inquiries also drain any rows that are due.
> - **DB fallback.** If the database doesn't answer within 4 s, the action emails the desk directly. If the write commits after that timeout, the desk can get the inquiry twice. This is accepted in exchange for never losing a lead.
> - **BotID (step 7) is not built.** Server actions post to whatever page the drawer is open on, which doesn't fit BotID's per-path setup. Spam control is still the honeypot plus the "mark spam" link.
> - **Tests.** `npm test` covers desk-link signing. The database checks above were run by hand and aren't in CI yet.

## 1. Where we are

The site has two ways for a lead to arrive, both server actions in `src/app/actions.ts`:

| Action | Entry points | What happens |
|---|---|---|
| `submitInquiry` | Inquiry drawer and `/inquiry`. Sample request, factory visit, private label, ship-to quote and shelf-date planner all prefill the drawer's **free-text note** and go through here. | Validate → one plain-text email to `INQUIRY_TO` through Resend (`reply_to` = buyer). If Resend fails, the buyer sees an error. If env vars are missing, the inquiry is only logged ("demo mode"). |
| `subscribe` | `SeasonSignup` ("next line sheet first") | One email to the desk asking a person to add the address to a mailing list. |

What goes wrong:

1. **Leads exist only as email.** No record is kept and nothing can be searched or reported. A deleted or filtered email is a lost lead.
2. **Delivery is all or nothing.** A Resend outage turns into a failed submit for the buyer. The only copy left is a `console.error` in function logs.
3. **"Tier pricing within 24 hours" is promised** in five places, and nothing measures it.
4. **The buyer gets no confirmation** after the on-screen message: no email with the summary and no reference number.
5. **Intent is lost.** A sample request and a visit request reach the desk as differently worded notes. They can't be routed or counted.
6. **Signups are handled by a person.** Adding an address to the mailing list is manual, and there is no unsubscribe mechanism. The privacy page promises "until you unsubscribe".
7. **Products are only referenced by id.** The catalog is TypeScript (`byId`). Once a style is renamed or removed, any stored id stops describing what the buyer actually asked for.
8. **Double submits create duplicates.** A double click or a retry on a flaky network sends two emails.
9. **Spam protection is one honeypot field.**

## 2. Requirements

### Functional

- **F1.** Every valid inquiry and signup is **recorded durably before** we tell the buyer it succeeded.
- **F2.** The trade desk gets a notification email for each inquiry, in at least the detail it gets today, and can still reply to it directly.
- **F3.** The buyer gets a confirmation email: a reference such as `CL-2026-0142`, their lines and the 24-hour promise.
- **F4.** Each inquiry has a structured **intent**: `quote | sample | visit | private_label | shipping`, plus the free-text note.
- **F5.** The desk can mark an inquiry *replied → quoted → won/lost/spam*. The first reply time is recorded.
- **F6.** Signups go onto a mailing list automatically, with a working unsubscribe link.
- **F7.** Inquiry lines **store a snapshot** of the product as it was at submit time: name, colour, size run, pack.
- **F8.** Optionally, inquiries can be synced to a CRM later without changing how they come in.

### Non-functional

| | Target | Why |
|---|---|---|
| Durability | No lead lost after the buyer sees "sent" | Each lead is worth far more than the infrastructure |
| Submit latency | p95 < 800 ms server time | Today's latency is one Resend call. Writing to the DB first should cost no more |
| Notification latency | p95 < 1 min, worst case < 15 min | Well inside the 24-hour SLA |
| Availability | If the DB is down, inquiries still go out by email | Never worse than today |
| Cost | About $0 at current volume | B2B volume is tiny (see §5) |
| Privacy | Matches `/privacy`: retention terms, export and deletion on request | Already promised publicly |
| Ops burden | No new service a solo dev has to babysit | Small team |

### Constraints

- Next 16 App Router on Vercel. `proxy.ts` reads `x-vercel-ip-country`, and Cloudflare is the fallback host.
- There is no data layer in the repo today. The catalog is code. Zustand + `localStorage` holds the list on the client (ADR-0001).
- Resend is already wired up and its env vars are documented.
- No buyer accounts or sign-in. None are planned.

## 3. High-level design

**Pattern:** write to the database first, with a **transactional outbox**. The server action writes the lead and its pending notifications in one transaction and returns. Sending happens afterwards: straight away through `after()`, and again from a cron if that fails.

```
 Browser                         Vercel Function (server action)                 Postgres (Neon)
 ───────                         ───────────────────────────────                 ───────────────
 InquiryForm ──FormData + key──▶ 1 honeypot + BotID check
                                 2 validate, snapshot lines from byId
                                 3 BEGIN
                                     INSERT inquiry (ON CONFLICT key DO NOTHING) ─▶ inquiries
                                     INSERT inquiry_lines ──────────────────────▶ inquiry_lines
                                     INSERT outbox × 2 (desk, buyer) ───────────▶ outbox
                                   COMMIT
            ◀── success + ref ── 4 return { status: "success", ref }
                                 5 after(() => drain(outbox rows for this ref))
                                          │
                                          ▼
                                     Resend ──▶ desk inbox (reply_to = buyer)
                                            ──▶ buyer confirmation
                                     UPDATE outbox SET sent_at

 Vercel Cron */5 ──▶ /api/cron/outbox ──▶ drain(pending, next_attempt_at <= now) with backoff
 Vercel Cron daily ─▶ /api/cron/sla ────▶ digest to desk: inquiries > 20 h with no reply

 Desk email ──"Mark replied / quoted / spam" (signed link)──▶ /desk/l/[ref] ──▶ UPDATE inquiries.status

 If the DB is unavailable at step 3: fall back to today's direct Resend send (desk only).
 If that also fails: return the error to the buyer, as today.
```

### Components

| Component | Where | Notes |
|---|---|---|
| `submitInquiry`, `subscribe` | `src/app/actions.ts` | Same signatures and `useActionState` contract. They return `ref` as well. |
| `src/lib/leads/db.ts` | new | Neon serverless driver (`@neondatabase/serverless`) with plain SQL. A query builder or ORM isn't worth it for four tables. |
| `src/lib/leads/outbox.ts` | new | `enqueue(tx, kind, leadId)` and `drain(filter)`. Claims rows with `FOR UPDATE SKIP LOCKED`, sends, marks sent or reschedules. |
| `src/lib/leads/mail.ts` | moved from `actions.ts` | `sendMail` and the templates (`emailText` plus a new buyer confirmation). Sends an `Idempotency-Key` header. |
| `/api/cron/outbox`, `/api/cron/sla` | new route handlers | Protected by `CRON_SECRET`. Schedules live in `vercel.ts`. |
| `/desk/l/[ref]` | new route | Signed-link status updates. No login. See §4.4. |
| Bot protection | Vercel BotID | Checked in the action before any write. The honeypot stays. |
| Mailing list | Resend audience/contacts | `subscribe` creates the contact. Resend handles broadcasts and unsubscribe. |

## 4. Deep dive

### 4.1 Data model

```sql
create type lead_status as enum ('new','replied','quoted','won','lost','spam');
create type lead_intent as enum ('quote','sample','visit','private_label','shipping');

create table inquiries (
  id              bigint generated always as identity primary key,
  ref             text unique not null,          -- CL-2026-0142, shown to buyer and desk
  idempotency_key uuid unique not null,          -- from the form, see 4.3
  created_at      timestamptz not null default now(),
  company         text not null check (length(company) <= 200),
  email           text not null check (length(email) <= 200),
  country         text not null,
  buyer_type      text not null,
  intent          lead_intent not null default 'quote',
  note            text not null default '' check (length(note) <= 4000),
  pairs           int  not null,
  -- context, for reporting; no IP address stored
  ip_country      text,                          -- x-vercel-ip-country
  season          text,                          -- cl-season cookie at submit
  source_path     text,                          -- page the drawer was opened from
  -- desk workflow
  status          lead_status not null default 'new',
  first_reply_at  timestamptz,
  status_at       timestamptz not null default now()
);
create index on inquiries (status, created_at);

create table inquiry_lines (
  inquiry_id  bigint not null references inquiries(id) on delete cascade,
  product_id  text   not null,                   -- byId key at the time
  name        text   not null,                   -- snapshot (F7)
  color       text   not null,
  sizes       text   not null,
  cases       int    not null check (cases > 0),
  pairs       int    not null,
  primary key (inquiry_id, product_id)
);

create table outbox (
  id              bigint generated always as identity primary key,
  inquiry_id      bigint references inquiries(id) on delete cascade,
  kind            text not null,                 -- 'notify_desk' | 'confirm_buyer' | 'crm_sync' (later)
  attempts        int  not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at         timestamptz,
  last_error      text,
  unique (inquiry_id, kind)
);
create index on outbox (next_attempt_at) where sent_at is null;
```

There is no `signups` table. Resend's contact list is the record for signups, so that unsubscribe and the stored state can't drift apart. If Resend is down, `subscribe` returns the error to the buyer, as it does today. That is acceptable because a lost signup costs far less than a lost inquiry.

The `ref` is `CL-<year>-<id padded to 4>`, built from the identity column inside the same transaction.

### 4.2 Structured intent

The prefill handoff in `useUI.openDrawer(type, email, note)` gains an `intent` argument, and the five buttons that call it pass their intent (`SampleRequest` → `sample`, `VisitRequest` → `visit`, and so on). The form sends it as a hidden field. The server accepts only known values and defaults to `quote`. The prefilled note text stays as it is, so the desk email reads the same.

### 4.3 Idempotency and retries

- **Submitting the form.** `InquiryForm` creates `crypto.randomUUID()` once per drawer session and sends it as a hidden `key` field. It makes a new key after a successful submit. When a second submit with the same key hits `ON CONFLICT DO NOTHING`, the action looks up the existing row and returns the same success and `ref`. Double clicks and network retries therefore create one lead.
- **Sending email.** Each outbox row sends with Resend's `Idempotency-Key: outbox-<id>`. A crash between "Resend accepted" and `UPDATE sent_at` then can't produce a duplicate email when the cron retries.
- **Backoff.** `next_attempt_at = now() + least(2^attempts, 60) minutes`. After 8 attempts (about 4 hours), the row stays pending and is reported (see §5.3). It is never dropped silently.
- **Concurrency.** `drain` claims rows with `select … for update skip locked limit 20`, so the `after()` drain and a cron run that overlap never send the same row twice.

### 4.4 Desk workflow without building an admin

The desk works from email, as it does today. The notification email gains three links:

```
Mark replied  ·  Mark quoted  ·  Mark spam
https://<site>/desk/l/CL-2026-0142?s=replied&t=<hmac>
```

- `t = HMAC-SHA256(DESK_SECRET, ref + ":" + status)`. It is compared in constant time.
- **Mail scanners won't trigger it.** `GET` only shows a confirm page, and the update is a `POST` from that page. Many corporate mail filters prefetch links.
- `first_reply_at` is set the first time the status moves past `new`.
- `/desk` is `noindex` and excluded from the sitemap.

A real dashboard can come later. Until then, the daily SLA digest and `psql` / the Neon console are the dashboard.

### 4.5 Failure modes

| Failure | Behaviour | Buyer sees |
|---|---|---|
| DB unreachable or times out (2 s) | Send the desk email directly (today's path). Log `lead.db_fallback`. | Success, with no ref. "Confirmation email to follow" is left out. |
| DB and Resend both down | Log the full inquiry with `console.error`, as today | The error message. Their list is kept locally (ADR-0001), so retrying is cheap. |
| Resend down after commit | Outbox rows wait. The cron retries with backoff. | Success, and the confirmation arrives late |
| BotID flags the request | Return a fake success, as the honeypot does. Log `lead.bot`. Nothing is written. | The normal success screen (no signal to bots) |
| Neon cold start | The first query takes about 300–500 ms extra. Within budget. | Nothing different |
| Env vars missing (dev / preview) | Demo mode stays: no `DATABASE_URL` means log only, and `delivered: false` | The existing demo notice |

Preview deployments get their own Neon branch through the Marketplace integration, so test inquiries never reach production data or the real desk inbox. Previews set `INQUIRY_TO` to a dev address.

### 4.6 Privacy

- The data collected is exactly what the form already collects. We add the **country** from the IP header but not the IP address.
- The privacy page gains a processor list (Vercel, Neon, Resend) and the reference number to quote when asking for export or deletion.
- **Retention:** inquiries in `spam` older than 30 days are deleted by the daily cron. Everything else is kept as `/privacy` already says. Deletion on request is `delete from inquiries where email = $1` (lines and outbox rows cascade).

## 5. Scale and reliability

### 5.1 Load estimate

These are assumptions. A wholesale footwear exporter with about 120 partners:

| | Typical | Campaign spike (new season line sheet) |
|---|---|---|
| Inquiries | 5–20 / day | about 200 / day, bursts of about 1 / s |
| Signups | 10–30 / day | about 1,000 / day |
| Emails sent | 2 per inquiry | about 400 / day + signups |
| DB size | well under 100 MB after years | — |

Every part of the design is several orders of magnitude below its limits. **Email-provider quota is the only one that could bind.** At spike volume, a Resend free plan's daily cap can be hit by inquiry confirmations alone. Check the plan's daily limit before a campaign. If it is hit, outbox rows simply wait and retry, so nothing is lost; the emails arrive late.

### 5.2 Scaling stance

Nothing here needs horizontal scaling. Vercel Functions (Fluid Compute) and Neon's serverless driver already handle concurrency. The outbox makes us tolerant of Resend outages. It is not there for throughput.

### 5.3 Monitoring

| Signal | How | Alert |
|---|---|---|
| Stuck notifications | The cron logs `outbox.pending_oldest_minutes` | > 15 min: send to a fallback address (`ALERT_TO`) through a second Resend sender. If Resend itself is the problem, Vercel log drains or alerts on `outbox.stuck` lines. |
| DB fallback used | `lead.db_fallback` log line | Any occurrence: Vercel log alert |
| SLA | Daily digest of inquiries older than 20 h still `new` | It goes to the desk itself, which is the point |
| Spam rate | Count of `lead.bot` per day | Review weekly. No alert. |
| Business | `select intent, status, count(*) …` | Monthly. This is the report the desk can't produce today. |

## 6. Options considered

| | A. Email only, hardened | **B. Postgres + outbox (chosen)** | C. CRM as the record (e.g. HubSpot) | D. Vercel Workflow / Queues |
|---|---|---|---|---|
| What it is | Today, plus a retry and a buyer confirmation | §3 | The action creates CRM contact + deal, with email as fallback | Each inquiry is a durable workflow: record → notify → wait 20 h → nudge |
| Durability | Weak: email is the record | Strong: the DB is the record | As strong as the CRM API plus our fallback | Strong |
| Reporting / SLA | None | SQL + digest | Excellent, built in | Built from workflow state |
| Build effort | ~0.5 day | ~3–4 days | ~2–3 days + CRM setup and seat costs | ~3 days, and a newer primitive the team doesn't know |
| New dependencies | None | Neon (Marketplace) | CRM account, API limits, vendor lock-in for the core record | Workflow DevKit |
| Desk UX change | None | Three links in an email they already get | Moves to the CRM. Big change in habits. | None |
| Fits privacy page | Yes | Yes (add processor) | Needs a processor + data-transfer review | Yes |

**Why B.** The core gap is *having a record that can't be lost*. B closes it with the smallest new surface: one managed database, four tables, two crons. It keeps the desk in their inbox and leaves C as a later add-on rather than a rewrite: a `crm_sync` outbox kind runs the CRM push off the same rows (F8). Move to C as the record only if the desk actually starts working in a CRM. D fits the "wait 20 h then nudge" step well, but a daily cron digest gives most of that value with primitives the team already understands.

**Why not A.** It is cheap, but it leaves 1, 3, 5 and 7 unsolved, and the privacy page already makes promises that need a record.

## 7. Rollout

1. **Infrastructure.** Add Neon from the Vercel Marketplace (production plus preview branches). `vercel env pull`. Write a migration script in `scripts/` that runs the SQL in §4.1.
2. **Write path.** Add `db.ts`, the outbox and the transaction in `submitInquiry`, with the DB fallback. The desk email stays byte-for-byte the same, apart from the ref in the subject. Ship this first; it alone fixes problems 1, 2 and 8.
3. **Sending.** Add `after()` drain + `/api/cron/outbox` + `CRON_SECRET` + schedules in `vercel.ts`. Add the buyer confirmation template.
4. **Intent.** Extend `openDrawer` and update the five call sites. Add the hidden field and server check.
5. **Desk links and SLA.** Add `/desk/l/[ref]`, `DESK_SECRET` and `/api/cron/sla`.
6. **Signups.** Point `subscribe` at Resend contacts. Remove the manual "add me" email.
7. **Bots.** Add the BotID check to both actions.
8. **Docs.** Update `/privacy` (processors, ref, spam retention) and the env var block in README / `actions.ts`.

Each step can be deployed on its own, and the site keeps working throughout.

## 8. What to revisit as it grows

- **A desk dashboard.** Once there is more than one person on the desk, or the links in emails stop being enough, build a protected `/desk` list view. This needs real auth at that point; Clerk is available on the Marketplace.
- **The CRM.** When sales wants pipelines and forecasting, add the `crm_sync` outbox consumer. The DB stays the inbound record.
- **Abandoned lists.** Following up on lists that were never sent needs server-side lists and consent. That reopens option D in ADR-0001 and changes the privacy promise. It is a business decision first.
- **The catalog moving out of code.** If products move to a CMS or DB, `inquiry_lines.product_id` can become a foreign key, and the snapshot columns stay for history.
- **Reply detection.** Inbound email parsing (Resend inbound or a BCC address) could set `first_reply_at` automatically, so the desk doesn't have to click.
