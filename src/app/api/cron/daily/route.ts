import { cronAuthorized } from "@/lib/leads/cron";
import { readContent } from "@/lib/content/store";
import { weeklySummary } from "@/lib/admin/weekly";
import { dbReady } from "@/lib/leads/db";
import { deskPath, deskReady } from "@/lib/leads/desk";
import { sendQuoteNudge } from "@/lib/leads/followup-mail";
import { claimBuyerNudge, markDeskFollowup, overdue, purgeSpam, quietQuotes, releaseBuyerNudge, type QuietQuote } from "@/lib/leads/inquiries";
import { deskInbox, INTENT_LABEL, mailReady, sendMail } from "@/lib/leads/mail";
import { drain, stuck } from "@/lib/leads/outbox";
import { absoluteUrl } from "@/lib/site";
import { runDueCampaigns } from "@/lib/marketing/send";
import { refreshScores } from "@/lib/marketing/store";

/**
 * Once a day: send anything still waiting, tell the desk which inquiries are close to the 24-hour promise and which
 * emails gave up, and delete spam marked over 30 days ago. Also re-scores the subscriber list's priorities from the
 * day's inquiries and sends any campaign still due (Admin → Marketing). Runs on every plan (Hobby allows daily crons only).
 * Quotes with no answer after 3 days are listed in the digest once; with Settings → Alerts → "Nudge buyers" on, a buyer
 * whose quote has gone 5 days unanswered also gets one short follow-up email.
 */

/** Buyer nudges sent per run at most: a backlog goes out over a few days rather than all at once. */
const NUDGE_CAP = 30;
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!dbReady()) return Response.json({ skipped: "no MONGODB_URI" });

  const sent = await drain({ limit: 100 });
  const { alerts } = await readContent();
  const [lateAll, failing, purged, rescored, campaigns, quietAll] = await Promise.all([
    overdue(),
    stuck(),
    purgeSpam(),
    refreshScores().catch((e) => (console.error("[marketing] daily re-score failed", e), 0)),
    runDueCampaigns({ budget: 5000 }).catch((e) => (console.error("[marketing] daily campaign run failed", e), null)),
    quietQuotes().catch((e) => (console.error("[followup] quiet quotes not read", e), [] as QuietQuote[])),
  ]);
  // "No reply after 24 hours" off in the admin panel (Settings → Alerts): the digest only reports stuck emails
  const late = alerts.notifyOverdue ? lateAll : [];
  // each quiet quote is listed in the digest once
  const quiet = quietAll.filter((q) => !q.followup?.deskAt);

  if (failing.length) console.error(`[outbox] outbox.stuck ${failing.length}`, failing);
  let listed = 0;
  if ((late.length || failing.length || quiet.length) && mailReady()) {
    const hours = (iso: Date | string) => Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
    const text = [
      late.length ? `Waiting for a first reply (the site promises 24 hours):` : `Every inquiry has had a reply.`,
      ...late.map(
        (i) =>
          `  ${i.ref}  ${hours(i.createdAt)} h  ${i.company} (${i.country}), ${INTENT_LABEL[i.intent]}${i.pairs ? `, ${i.pairs.toLocaleString("en-US")} pairs` : ""}` +
          (deskReady() ? `\n      mark replied: ${absoluteUrl(deskPath(i.ref, "replied"))}` : ""),
      ),
      ...(quiet.length
        ? [
            "",
            `Quotes with no answer after 3 days (worth a follow-up):`,
            ...quiet.map(
              (q) =>
                `  ${q.ref}  ${Math.floor(hours(q.lastDeskAt) / 24)} d  ${q.company} (${q.country}), ${INTENT_LABEL[q.intent]}${q.pairs ? `, ${q.pairs.toLocaleString("en-US")} pairs` : ""}` +
                `\n      open: ${absoluteUrl(`/admin/inquiries/${q.ref}`)}`,
            ),
          ]
        : []),
      ...(failing.length
        ? ["", `Emails that haven't gone out (check RESEND_API_KEY, the sender domain and the daily limit):`, ...failing.map((f) => `  ${f.ref}  ${f.kind}, ${f.attempts} tries: ${f.last_error ?? "waiting"}`)]
        : []),
    ].join("\n");
    const error = await sendMail({
      to: deskInbox(),
      replyTo: deskInbox(),
      subject: `Inquiry desk: ${late.length} waiting for a reply${quiet.length ? `, ${quiet.length} quotes unanswered` : ""}${failing.length ? `, ${failing.length} emails stuck` : ""}`,
      text,
      idempotencyKey: `digest-${new Date().toISOString().slice(0, 10)}`,
    });
    if (error) console.error("[digest] not sent", error);
    // only once the desk has actually been told; a failed digest lists them again tomorrow
    else if (quiet.length) {
      await markDeskFollowup(quiet.map((q) => q.ref)).catch((e) => console.error("[followup] desk follow-ups not marked", e));
      listed = quiet.length;
    }
  }

  // The buyer nudge: 5 days without an answer, never twice for the same quote. Each is claimed before it is sent (so
  // two runs can't both send it) and handed back if the send fails, so the next run tries again.
  let nudged = 0;
  let nudgeFailed = 0;
  if (alerts.nudgeBuyers && mailReady()) {
    const due = quietAll.filter((q) => !q.followup?.buyerAt && Date.now() - new Date(q.lastDeskAt).getTime() > 5 * 86_400_000).slice(0, NUDGE_CAP);
    for (const q of due) {
      const at = new Date();
      if (!(await claimBuyerNudge(q.ref, at))) continue;
      const error = await sendQuoteNudge(q);
      if (!error) nudged++;
      else {
        nudgeFailed++;
        console.error(`[followup] nudge for ${q.ref} not sent`, error);
        await releaseBuyerNudge(q.ref, at).catch((e) => console.error(`[followup] nudge claim for ${q.ref} not released`, e));
      }
    }
  }
  // Mondays (Guangzhou time), if switched on: the week in numbers
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Shanghai" }).format(new Date());
  if (alerts.weekly && weekday === "Mon" && mailReady()) {
    const error = await sendMail({ to: deskInbox(), replyTo: deskInbox(), subject: "Chime Long: the week in numbers", text: await weeklySummary(), idempotencyKey: `weekly-${new Date().toISOString().slice(0, 10)}` });
    if (error) console.error("[weekly] not sent", error);
  }
  return Response.json({
    ...sent,
    overdue: late.length,
    stuck: failing.length,
    purged,
    rescored,
    campaigns,
    followups: { quiet: quietAll.length, listedForDesk: listed, buyersNudged: nudged, nudgesFailed: nudgeFailed },
  });
}
