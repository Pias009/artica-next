import { cronAuthorized } from "@/lib/leads/cron";
import { readContent } from "@/lib/content/store";
import { weeklySummary } from "@/lib/admin/weekly";
import { dbReady } from "@/lib/leads/db";
import { deskPath, deskReady } from "@/lib/leads/desk";
import { overdue, purgeSpam } from "@/lib/leads/inquiries";
import { deskInbox, INTENT_LABEL, mailReady, sendMail } from "@/lib/leads/mail";
import { drain, stuck } from "@/lib/leads/outbox";
import { absoluteUrl } from "@/lib/site";
import { runDueCampaigns } from "@/lib/marketing/send";
import { refreshScores } from "@/lib/marketing/store";

/**
 * Once a day: send anything still waiting, tell the desk which inquiries are close to the 24-hour promise and which
 * emails gave up, and delete spam marked over 30 days ago. Also re-scores the subscriber list's priorities from the
 * day's inquiries and sends any campaign still due (Admin → Marketing). Runs on every plan (Hobby allows daily crons only).
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!dbReady()) return Response.json({ skipped: "no MONGODB_URI" });

  const sent = await drain({ limit: 100 });
  const { alerts } = await readContent();
  const [lateAll, failing, purged, rescored, campaigns] = await Promise.all([
    overdue(),
    stuck(),
    purgeSpam(),
    refreshScores().catch((e) => (console.error("[marketing] daily re-score failed", e), 0)),
    runDueCampaigns({ budget: 5000 }).catch((e) => (console.error("[marketing] daily campaign run failed", e), null)),
  ]);
  // "No reply after 24 hours" off in the admin panel (Settings → Alerts): the digest only reports stuck emails
  const late = alerts.notifyOverdue ? lateAll : [];

  if (failing.length) console.error(`[outbox] outbox.stuck ${failing.length}`, failing);
  if ((late.length || failing.length) && mailReady()) {
    const hours = (iso: Date | string) => Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
    const text = [
      late.length ? `Waiting for a first reply (the site promises 24 hours):` : `Every inquiry has had a reply.`,
      ...late.map(
        (i) =>
          `  ${i.ref}  ${hours(i.createdAt)} h  ${i.company} (${i.country}), ${INTENT_LABEL[i.intent]}${i.pairs ? `, ${i.pairs.toLocaleString("en-US")} pairs` : ""}` +
          (deskReady() ? `\n      mark replied: ${absoluteUrl(deskPath(i.ref, "replied"))}` : ""),
      ),
      ...(failing.length
        ? ["", `Emails that haven't gone out (check RESEND_API_KEY, the sender domain and the daily limit):`, ...failing.map((f) => `  ${f.ref}  ${f.kind}, ${f.attempts} tries: ${f.last_error ?? "waiting"}`)]
        : []),
    ].join("\n");
    const error = await sendMail({
      to: deskInbox(),
      replyTo: deskInbox(),
      subject: `Inquiry desk: ${late.length} waiting for a reply${failing.length ? `, ${failing.length} emails stuck` : ""}`,
      text,
      idempotencyKey: `digest-${new Date().toISOString().slice(0, 10)}`,
    });
    if (error) console.error("[digest] not sent", error);
  }
  // Mondays (Guangzhou time), if switched on: the week in numbers
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Shanghai" }).format(new Date());
  if (alerts.weekly && weekday === "Mon" && mailReady()) {
    const error = await sendMail({ to: deskInbox(), replyTo: deskInbox(), subject: "Chime Long: the week in numbers", text: await weeklySummary(), idempotencyKey: `weekly-${new Date().toISOString().slice(0, 10)}` });
    if (error) console.error("[weekly] not sent", error);
  }
  return Response.json({ ...sent, overdue: late.length, stuck: failing.length, purged, rescored, campaigns });
}
