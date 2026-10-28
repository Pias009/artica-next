import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dbReady } from "@/lib/leads/db";
import { deskPath, deskTokenOk, isDeskStatus } from "@/lib/leads/desk";
import { findInquiry, setStatus } from "@/lib/leads/inquiries";
import { INTENT_LABEL } from "@/lib/leads/mail";

export const metadata: Metadata = { title: "Inquiry status", robots: { index: false, follow: false } };

/**
 * Where the status links in a desk email land ("Mark quoted" …). Opening the link only shows the inquiry and a
 * button: mail scanners open links on their own, so the change itself needs the button's POST.
 */
export default async function DeskLink({ params, searchParams }: PageProps<"/desk/l/[ref]">) {
  const { ref } = await params;
  const q = await searchParams;
  const [s, t, done] = [q.s, q.t, q.done].map((v) => (typeof v === "string" ? v : ""));
  if (!dbReady() || !isDeskStatus(s) || !deskTokenOk(ref, s, t)) notFound();
  const inquiry = await findInquiry(ref);
  if (!inquiry) notFound();

  async function confirm() {
    "use server";
    // checked again here: a server action can be called without the page
    if (!isDeskStatus(s) || !deskTokenOk(ref, s, t)) notFound();
    await setStatus(ref, s);
    redirect(`${deskPath(ref, s)}&done=1`);
  }

  const when = (iso: Date | string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  return (
    <div className="bg-studio mx-auto my-10 grid max-w-[560px] gap-5 rounded-shell px-6 py-12 text-center">
      <p className="text-xs font-bold tracking-[.14em] text-muted uppercase">{inquiry.ref}</p>
      <h1 className="font-headline text-[clamp(26px,3.6vw,38px)] leading-tight font-semibold tracking-[-0.015em]">
        {inquiry.company} <span className="text-ink-2">({inquiry.country})</span>
      </h1>
      <dl className="mx-auto grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-left text-[14px]">
        <dt className="text-muted">Wants</dt>
        <dd>
          {INTENT_LABEL[inquiry.intent]}
          {inquiry.pairs ? `, ${inquiry.pairs.toLocaleString("en-US")} pairs` : ""}
        </dd>
        <dt className="text-muted">Received</dt>
        <dd>{when(inquiry.createdAt)} (Guangzhou)</dd>
        <dt className="text-muted">First reply</dt>
        <dd>{inquiry.firstReplyAt ? when(inquiry.firstReplyAt) : "Not yet"}</dd>
        <dt className="text-muted">Status</dt>
        <dd className="font-semibold">{inquiry.status}</dd>
      </dl>
      {done || inquiry.status === s ? (
        <p role="status" className="font-semibold">
          Marked {s}.
        </p>
      ) : (
        <form action={confirm}>
          <button type="submit" className="btn btn-dark">
            Mark {s}
          </button>
        </form>
      )}
    </div>
  );
}
