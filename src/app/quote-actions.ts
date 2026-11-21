"use server";

import { revalidatePath } from "next/cache";
import { dbReady, inquiries, type BuyerAction, type BuyerResponse } from "@/lib/leads/db";
import { setStatus } from "@/lib/leads/inquiries";
import { deskInbox, mailReady, sendMail } from "@/lib/leads/mail";
import { quoteTokenOk } from "@/lib/leads/quote-link";
import { rateLimited } from "@/lib/leads/ratelimit";
import { absoluteUrl } from "@/lib/site";

/*
 * The buyer's answer on their quote page (/q/CL-…): accept the quote, ask for samples first, or ask a question. No
 * login: the signed link in the details email is the permission, so the token is checked here again (a server action
 * can be called without the page). The answer is kept on the inquiry, shows on the desk's request page, and is
 * emailed to the desk so nobody has to watch the panel.
 */

const REF = /^CL-\d{4}-\d{4,}$/;
const ACTIONS: readonly BuyerAction[] = ["accept", "samples", "question"];
const MAX_MESSAGE = 2000;
/** Answers kept per inquiry (oldest dropped), and how many one inquiry may send in a day: enough for a real buyer. */
const KEEP = 50;
const PER_DAY = 10;
const DAY = 24 * 3_600_000;

const SUBJECT: Record<BuyerAction, string> = {
  accept: "Buyer accepted the quote",
  samples: "Buyer asked for samples first",
  question: "Buyer asked a question about the quote",
};

export type QuoteResult = { ok: true } | { ok: false; error: string };

export async function respondToQuote(ref: string, token: string, action: BuyerAction, message: string): Promise<QuoteResult> {
  if (typeof ref !== "string" || typeof token !== "string" || !REF.test(ref) || !quoteTokenOk(ref, token))
    return { ok: false, error: "This quote link isn't valid any more. Reply to our email instead and we'll pick it up." };
  // per connection, on top of the per-inquiry daily cap below
  if (await rateLimited("respondToQuote")) return { ok: false, error: "Too many tries from this connection. Please wait a few minutes and try again." };
  if (!ACTIONS.includes(action)) return { ok: false, error: "Choose one of the three answers." };
  const text = typeof message === "string" ? message.trim() : "";
  if (text.length > MAX_MESSAGE) return { ok: false, error: `Please keep the message under ${MAX_MESSAGE.toLocaleString("en-US")} characters.` };
  if (action === "question" && !text) return { ok: false, error: "Write your question so the desk can answer it." };
  if (!dbReady()) return { ok: false, error: "We can't take answers here right now. Please reply to our email instead." };

  const doc = await inquiries().findOne({ ref }, { projection: { ref: 1, company: 1, email: 1, status: 1, "details.sentAt": 1 } });
  if (!doc) return { ok: false, error: "That quote wasn't found. Please reply to our email instead." };
  // accepting or asking for samples only makes sense once there is a quote to answer; a question can come any time
  if (action !== "question" && !doc.details?.sentAt) return { ok: false, error: "Your quote is still being prepared. Ask a question in the meantime, or wait for our email." };

  // One write, conditional on fewer than PER_DAY answers in the last day, so two quick submits can't both slip past
  // the limit. $slice keeps the newest KEEP.
  const at = new Date();
  const entry: BuyerResponse = { action, message: text, at };
  const since = new Date(at.getTime() - DAY);
  const { matchedCount } = await inquiries().updateOne(
    {
      ref,
      $expr: { $lt: [{ $size: { $filter: { input: { $ifNull: ["$buyerResponses", []] }, cond: { $gt: ["$$this.at", since] } } } }, PER_DAY] },
    },
    { $push: { buyerResponses: { $each: [entry], $slice: -KEEP } } },
  );
  if (!matchedCount) return { ok: false, error: "We've had several answers on this quote today. Please reply to our email and the desk will take it from there." };

  if (action === "accept" && doc.status !== "won") await setStatus(ref, "won");

  if (mailReady()) {
    const admin = absoluteUrl(`/admin/inquiries/requests/${encodeURIComponent(ref)}`);
    const who = doc.company && !doc.company.includes("@") ? `${doc.company} (${doc.email})` : doc.email;
    // a failed alert doesn't fail the buyer's answer: it is stored and shows in the panel either way
    await sendMail({
      to: deskInbox(),
      replyTo: [doc.email],
      subject: `[${ref}] ${SUBJECT[action]}`,
      text: [
        `${who} answered their quote ${ref} on the quote page.`,
        ``,
        `Answer: ${SUBJECT[action]}${action === "accept" ? " (the inquiry is now marked won)" : ""}`,
        ``,
        ...(text ? [`Their message:`, text, ``] : [`No message.`, ``]),
        `Open the request: ${admin}`,
        `Reply to this email to answer the buyer directly.`,
      ].join("\n"),
      idempotencyKey: `${ref}-buyer-${at.getTime()}`,
    }).catch(() => null);
  }

  revalidatePath("/admin", "layout");
  return { ok: true };
}
