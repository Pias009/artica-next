import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ReplyDraft } from "./ReplyDraft";
import { StatusBadge } from "../../StatusBadge";
import { retryEmailsAction, setStatusAction } from "../../../actions";
import { requireAdmin } from "@/lib/admin/auth";
import { hoursSince, span, STATUS_LABEL, when } from "@/lib/admin/format";
import { DUE_HOURS, historyFor, inquiryDetail, MAX_ATTEMPTS } from "@/lib/admin/inquiries";
import { MAIL_KINDS, type MailKind } from "@/lib/leads/db";
import { DESK_STATUSES } from "@/lib/leads/desk";
import { INTENT_LABEL } from "@/lib/leads/mail";
import { quote, TIERS, usd } from "@/lib/admin/prices";
import { readContent } from "@/lib/content/store";

export async function generateMetadata({ params }: PageProps<"/admin/inquiries/[ref]">): Promise<Metadata> {
  return { title: (await params).ref };
}

const MAIL_LABEL: Record<MailKind, string> = {
  notify_desk: "To the desk",
  confirm_buyer: "Buyer's confirmation",
};
const ACTION_LABEL: Record<string, string> = {
  status: "Marked",
  retry_emails: "Retried emails",
  reply_drafted: "Drafted a reply with Kai",
};

export default async function InquiryPage({ params }: PageProps<"/admin/inquiries/[ref]">) {
  await requireAdmin();
  const { ref } = await params;
  const [i, history, content] = await Promise.all([inquiryDetail(ref), historyFor(ref), readContent()]);
  if (!i) notFound();
  const q = quote(i.lines, content.prices);
  const n = (x: number) => x.toLocaleString("en-US");
  const late = i.status === "new" && hoursSince(i.createdAt) >= DUE_HOURS;
  const unsent = MAIL_KINDS.some((k) => !i.mail[k].sentAt);
  const reply = `mailto:${encodeURIComponent(i.email)}?subject=${encodeURIComponent(`Your Chime Long inquiry ${i.ref}`)}`;

  return (
    <>
      <Link href="/admin/inquiries/all" className="text-[13px] font-semibold text-ink-2 hover:text-ink">
        ← Inquiries
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[.14em] text-muted uppercase">{i.ref}</p>
          <h1 className="mt-1 font-headline text-[30px] leading-tight font-semibold tracking-[-0.015em]">{i.company}</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            {INTENT_LABEL[i.intent]} · received {when(i.createdAt)} <span className={clsx(late && "font-semibold text-danger")}>({span(i.createdAt)} ago)</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={i.status} />
          <a href={reply} className="btn btn-dark">
            Reply by email
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="grid gap-4">
          <Card title={i.lines.length ? `Styles · ${i.lines.length}, ${n(i.pairs)} pairs` : "Styles"}>
            {i.lines.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[13.5px]">
                  <thead className="text-[12px] text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Style</th>
                      <th className="py-2 pr-3 font-semibold">Colour</th>
                      <th className="py-2 pr-3 font-semibold">Sizes</th>
                      <th className="py-2 pr-3 text-right font-semibold">Cases</th>
                      <th className="py-2 pr-3 text-right font-semibold">Pairs</th>
                      <th className="py-2 pr-3 text-right font-semibold">Price / pair</th>
                      <th className="py-2 text-right font-semibold">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.rows.map((l) => (
                      <tr key={l.productId} className="border-t border-line">
                        <td className="py-2 pr-3 font-semibold">{l.name}</td>
                        <td className="py-2 pr-3">{l.color}</td>
                        <td className="py-2 pr-3 text-ink-2">{l.sizes}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{n(l.cases)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{n(l.pairs)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {l.price !== null ? (
                            <>
                              {usd(l.price)} <span className="text-[11px] text-muted">{TIERS.find((t) => t.key === l.tier)?.label}</span>
                            </>
                          ) : (
                            <Link href={`/admin/products/${l.productId}`} className="text-[12px] font-semibold text-brand underline">
                              Set price
                            </Link>
                          )}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">{l.total !== null ? usd(l.total) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                  {q.total > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-ink/20">
                        <td colSpan={6} className="py-2 pr-3 text-right font-semibold">
                          {q.complete ? "Order total, FOB" : `Priced lines (${q.missing.length} without a price)`}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">{usd(q.total)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <p className="text-[14px] text-ink-2">None chosen: they asked for the full line sheet.</p>
            )}
            <p className="mt-3 text-[12px] text-muted">Styles as they were when sent; the catalog may have changed since. Prices are your own (Products), at the tier each line reaches.</p>
          </Card>

          <Card title="Reply with Kai">
            <ReplyDraft inquiryRef={i.ref} email={i.email} />
          </Card>

          <Card title="Note">{i.note ? <p className="text-[14px] whitespace-pre-wrap">{i.note}</p> : <p className="text-[14px] text-muted">No note.</p>}</Card>

          <Card title="History">
            <ol className="grid gap-2 text-[13.5px]">
              {history.map((h) => (
                <li key={String(h._id)} className="flex flex-wrap gap-x-2">
                  <span className="text-muted tabular-nums">{when(h.at)}</span>
                  <span>
                    {ACTION_LABEL[h.action] ?? h.action}{" "}
                    {h.action === "status" && h.detail ? STATUS_LABEL[h.detail as keyof typeof STATUS_LABEL]?.toLowerCase() : h.detail}
                  </span>
                  <span className="text-muted">by {h.email}</span>
                </li>
              ))}
              <li className="flex flex-wrap gap-x-2">
                <span className="text-muted tabular-nums">{when(i.createdAt)}</span>
                <span>Received from the {i.sourcePath ?? "site"} page</span>
              </li>
            </ol>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card title="Status">
            <form action={setStatusAction} className="flex flex-wrap gap-1.5">
              <input type="hidden" name="ref" value={i.ref} />
              {DESK_STATUSES.map((s) => (
                <button
                  key={s}
                  type="submit"
                  name="status"
                  value={s}
                  disabled={i.status === s}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-[13px] font-semibold",
                    i.status === s ? "bg-ink text-white" : "bg-chip text-ink-2 hover:bg-chip-hover hover:text-ink",
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </form>
            <p className="mt-3 text-[12.5px] text-muted">
              First reply: {i.firstReplyAt ? `${when(i.firstReplyAt)}, after ${span(i.createdAt, i.firstReplyAt)}` : "not yet"}.
            </p>
          </Card>

          <Card title="Buyer">
            <Facts
              rows={[
                [
                  "Email",
                  <a key="e" href={reply} className="break-all underline underline-offset-2">
                    {i.email}
                  </a>,
                ],
                ["Buyer", i.buyerType],
                ["Ship to", i.country],
                ["Browsing from", i.ipCountry ?? "—"],
                ["Season shown", i.season ?? "—"],
              ]}
            />
          </Card>

          <Card title="Emails">
            <ul className="grid gap-2.5 text-[13.5px]">
              {MAIL_KINDS.map((k) => {
                const m = i.mail[k];
                return (
                  <li key={k}>
                    <span className="font-semibold">{MAIL_LABEL[k]}</span>
                    <span className={clsx("block text-[12.5px]", m.sentAt ? "text-ink-2" : m.attempts ? "text-danger" : "text-muted")}>
                      {m.sentAt
                        ? `Sent ${when(m.sentAt)}`
                        : m.attempts >= MAX_ATTEMPTS
                          ? `Gave up after ${m.attempts} tries`
                          : m.attempts
                            ? `Failed ${m.attempts}×, next try ${when(m.nextAt)}`
                            : "Waiting to send"}
                      {!m.sentAt && m.lastError && <span className="block break-words text-muted">{m.lastError}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            {unsent && (
              <form action={retryEmailsAction} className="mt-3">
                <input type="hidden" name="ref" value={i.ref} />
                <button type="submit" className="btn btn-line">
                  Send now
                </button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-white p-5">
      <h2 className="mb-3 text-[13px] font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
