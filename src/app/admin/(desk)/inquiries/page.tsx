import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "../StatusBadge";
import { requireAdmin } from "@/lib/admin/auth";
import { hoursSince, span, STATUS_LABEL, when } from "@/lib/admin/format";
import { dashboard, DUE_HOURS, INTENTS, listInquiries, parseQuery, STATUSES, type ListQuery } from "@/lib/admin/inquiries";
import { INTENT_LABEL } from "@/lib/leads/mail";

export const metadata: Metadata = { title: "Inquiries" };

/** The address for this list with some of its filters changed (any filter change goes back to page 1). */
function href(q: ListQuery, patch: Partial<ListQuery>) {
  const next = { ...q, page: 1, ...patch };
  const p = new URLSearchParams();
  if (next.status !== "all") p.set("status", next.status);
  if (next.intent !== "all") p.set("intent", next.intent);
  if (next.q) p.set("q", next.q);
  if (next.page > 1) p.set("page", String(next.page));
  const s = p.toString();
  return s ? `/admin/inquiries?${s}` : "/admin/inquiries";
}

export default async function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  await requireAdmin();
  const q = parseQuery(await searchParams);
  const [stats, list] = await Promise.all([dashboard(), listInquiries(q)]);
  const n = (x: number) => x.toLocaleString("en-US");

  const tiles: [string, string, string?][] = [
    ["Waiting for a reply", n(stats.byStatus.new)],
    [`Over ${DUE_HOURS} hours`, n(stats.overdue), stats.overdue ? "text-danger" : undefined],
    ["Last 7 days", n(stats.week)],
    ["Median first reply", stats.medianReplyHours === null ? "—" : stats.medianReplyHours < 1 ? "< 1 h" : `${Math.round(stats.medianReplyHours)} h`],
  ];
  const chips: [ListQuery["status"], string, number][] = [
    ["all", "All", stats.total],
    ["overdue", `Over ${DUE_HOURS} h`, stats.overdue],
    ...STATUSES.map((s): [ListQuery["status"], string, number] => [s, STATUS_LABEL[s], stats.byStatus[s]]),
  ];

  return (
    <>
      <h1 className="font-headline text-[30px] leading-tight font-semibold tracking-[-0.015em]">Inquiries</h1>

      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([label, value, tone]) => (
          <div key={label} className="rounded-card bg-white px-4 py-3.5">
            <dt className="text-[12.5px] font-semibold text-muted">{label}</dt>
            <dd className={clsx("mt-1 text-[26px] font-semibold tracking-[-0.02em] tabular-nums", tone)}>{value}</dd>
          </div>
        ))}
      </dl>

      {stats.emailsStuck > 0 && (
        <p role="alert" className="mt-4 rounded-card bg-blush px-4 py-3 text-[13.5px] text-danger">
          {stats.emailsStuck} email{stats.emailsStuck > 1 ? "s haven't" : " hasn't"} gone out. Inquiries with a failing email are marked below; open one to
          retry. Check RESEND_API_KEY, the sender domain and the daily limit.
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-1.5">
        {chips.map(([status, label, count]) => (
          <Link
            key={status}
            href={href(q, { status })}
            aria-current={q.status === status ? "true" : undefined}
            className={clsx(
              "rounded-full px-3 py-1.5 text-[13px] font-semibold",
              q.status === status ? "bg-ink text-white" : "bg-white text-ink-2 hover:text-ink",
              status === "overdue" && count > 0 && q.status !== status && "text-danger",
            )}
          >
            {label} <span className="tabular-nums opacity-70">{n(count)}</span>
          </Link>
        ))}
      </div>

      <form action="/admin/inquiries" className="mt-3 flex flex-wrap gap-2">
        {q.status !== "all" && <input type="hidden" name="status" value={q.status} />}
        <input name="q" defaultValue={q.q} placeholder="Search ref, company, email or country" aria-label="Search" className="field min-w-0 flex-1 basis-64 bg-white" />
        <select name="intent" defaultValue={q.intent} aria-label="What they asked for" className="field w-auto bg-white">
          <option value="all">Any request</option>
          {INTENTS.map((i) => (
            <option key={i} value={i}>
              {INTENT_LABEL[i]}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-dark">
          Search
        </button>
        {(q.q || q.intent !== "all") && (
          <Link href={href(q, { q: "", intent: "all" })} className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-card bg-white">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead className="border-b border-line text-[12px] text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Inquiry</th>
              <th className="px-4 py-3 font-semibold">Received</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Wants</th>
              <th className="px-4 py-3 text-right font-semibold">Pairs</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell">First reply</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((r) => {
              const late = r.status === "new" && hoursSince(r.createdAt) >= DUE_HOURS;
              return (
                <tr key={r.ref} className="border-b border-line last:border-0 hover:bg-tile/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/inquiries/${r.ref}`} className="font-semibold text-ink underline-offset-2 hover:underline">
                      {r.company}
                    </Link>
                    <span className="block text-[12.5px] text-muted">
                      {r.ref} · {r.country}
                      {r.mailFailing && <span className="ml-1.5 font-semibold text-danger">· email failing</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {when(r.createdAt)}
                    <span className={clsx("block text-[12.5px]", late ? "font-semibold text-danger" : "text-muted")}>{span(r.createdAt)} ago</span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {INTENT_LABEL[r.intent]}
                    <span className="block text-[12.5px] text-muted">
                      {r.lineCount ? `${r.lineCount} style${r.lineCount > 1 ? "s" : ""}` : "Full line sheet"} · {r.buyerType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.pairs ? n(r.pairs) : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-ink-2 lg:table-cell">{r.firstReplyAt ? `after ${span(r.createdAt, r.firstReplyAt)}` : "—"}</td>
                </tr>
              );
            })}
            {!list.rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-2">
                  {stats.total ? "No inquiries match." : "No inquiries yet. They appear here as soon as a buyer sends one."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {list.pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-[13px] text-ink-2">
          <span className="tabular-nums">
            Page {q.page} of {list.pages} · {n(list.total)} inquiries
          </span>
          <span className="flex gap-2">
            {q.page > 1 && (
              <Link href={href(q, { page: q.page - 1 })} className="btn btn-line">
                Newer
              </Link>
            )}
            {q.page < list.pages && (
              <Link href={href(q, { page: q.page + 1 })} className="btn btn-line">
                Older
              </Link>
            )}
          </span>
        </nav>
      )}
    </>
  );
}
