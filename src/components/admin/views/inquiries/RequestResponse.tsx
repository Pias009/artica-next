"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ago, usePanel } from "../../panel-data";
import { AdminIcon, Card, flash } from "../../ui";
import { RequestState } from "./EmailRequests";
import { saveDetailsAction, type DetailsInput } from "@/app/admin/request-actions";
import { priceFor, TIERS, usd } from "@/lib/admin/prices";
import type { PanelInquiry, PanelProduct } from "@/lib/admin/panel";
import { LEAD, MOQ_CASES, PACK } from "@/lib/products";

/** Suggested terms for a new response: the site's own (product pages, FAQ); the desk edits them per buyer. */
const TERMS = {
  leadTime: `About ${LEAD.bulk.replace("d", "")} days of production after you confirm`,
  samples: `About ${LEAD.samples.replace("d", "")} days, one pair per style`,
  payment: "30% deposit on order confirmation, 70% balance against the bill of lading",
  shipping: "FOB Guangzhou; DDP or EXW on request",
};
const TERM_FIELDS = [
  ["leadTime", "Lead time"],
  ["samples", "Samples"],
  ["payment", "Payment"],
  ["shipping", "Shipping"],
] as const;
/** Products shown in the picker before "Show more". */
const PICK = 12;

type Line = { productId: string; cases: number; price: number | null };
type Details = NonNullable<PanelInquiry["details"]>;
type Answer = PanelInquiry["buyerResponses"][number];

/** The buyer's answers from their quote page (/q/CL-…), each with its own colour so the latest reads at a glance. */
const ANSWER = {
  accept: { label: "Buyer accepted the quote", short: "Accepted the quote", tone: "bg-[#e3f1e8] text-[#1f6b45] ring-[#1f6b45]/20", dot: "bg-[#1f6b45]" },
  samples: { label: "Buyer asked for samples first", short: "Asked for samples", tone: "bg-[#fbf0dc] text-[#7a4a14] ring-[#7a4a14]/20", dot: "bg-[#b7791f]" },
  question: { label: "Buyer asked a question", short: "Asked a question", tone: "bg-[#e3eef7] text-[#1d4f7a] ring-[#1d4f7a]/20", dot: "bg-[#2f6fa8]" },
} as const;

const INPUT = "min-h-11 w-full rounded-xl bg-white px-3.5 text-[14px] ring-1 ring-ink/10 outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-ink";
const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * The response to one email request, as a page of its own (/admin/inquiries/requests/CL-…): the products with their
 * photos, cases and price per pair, a picker to add more, the terms and a message, and on the right the totals, the
 * buyer and the send button (saveDetailsAction in app/admin/request-actions.ts emails it, photos included).
 */
export function RequestResponse({ refId }: { refId: string }) {
  const panel = usePanel();
  const item = panel.inquiries.find((i) => i.ref === refId);
  if (!item)
    return (
      <Card>
        <p className="text-[15px] font-semibold">That request isn&rsquo;t in the latest inquiries.</p>
        <p className="mt-1 text-[14px] text-ink/60">It may be older than the last 150, or the reference is wrong.</p>
        <Link href="/admin/inquiries" className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white">
          Back to inquiries
        </Link>
      </Card>
    );
  return <Response key={item.ref} item={item} />;
}

function Response({ item }: { item: PanelInquiry }) {
  const panel = usePanel();
  const byId = useMemo(() => new Map(panel.products.map((p) => [p.id, p])), [panel.products]);
  const prices = panel.content.prices;
  const suggest = (productId: string, cases: number) => priceFor(prices[productId], cases * PACK);
  const asked = useMemo(() => new Set(item.lines.map((l) => l.productId)), [item.lines]);

  const saved = item.details;
  const [lines, setLines] = useState<Line[]>(
    () => saved?.lines ?? item.lines.filter((l) => byId.has(l.productId)).map((l) => ({ ...l, price: suggest(l.productId, l.cases)?.price ?? null })),
  );
  const [terms, setTerms] = useState({
    leadTime: saved?.leadTime ?? TERMS.leadTime,
    samples: saved?.samples ?? TERMS.samples,
    payment: saved?.payment ?? TERMS.payment,
    shipping: saved?.shipping ?? TERMS.shipping,
  });
  const [message, setMessage] = useState(saved?.message ?? "");
  const [status, setStatus] = useState<Details | null>(saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // newest first; the panel keeps them oldest first, as stored
  const answers = useMemo(() => [...item.buyerResponses].reverse(), [item.buyerResponses]);

  const set = (id: string, patch: Partial<Line>) => setLines((all) => all.map((l) => (l.productId === id ? { ...l, ...patch } : l)));
  const add = (id: string) => setLines((all) => (all.some((l) => l.productId === id) ? all : [...all, { productId: id, cases: MOQ_CASES, price: suggest(id, MOQ_CASES)?.price ?? null }]));
  const cases = lines.reduce((a, l) => a + l.cases, 0);
  const pairs = cases * PACK;
  const priced = lines.filter((l) => l.price !== null);
  const total = priced.reduce((a, l) => a + l.price! * l.cases * PACK, 0);

  const submit = (send: boolean) =>
    start(async () => {
      setError(null);
      const input: DetailsInput = { lines, ...terms, message };
      const r = await saveDetailsAction(item.ref, input, send).catch(() => ({ ok: false as const, error: "Couldn't reach the server.", saved: false }));
      const now = new Date().toISOString();
      const next: Details = {
        lines,
        ...terms,
        message,
        savedAt: now,
        sentAt: r.ok && r.sent ? r.at : (status?.sentAt ?? null),
        sentBy: status?.sentBy ?? null,
        lastError: r.ok ? null : r.error,
      };
      if (r.ok || r.saved) setStatus(next);
      if (r.ok) flash(r.sent ? `Inquiry details sent to ${item.email}` : "Draft saved");
      else setError(r.error);
    });

  return (
    <div className="pb-6">
      {/* the page's own head: back, who it's for, where it stands */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/inquiries" className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-ink/60 hover:text-ink">
            <AdminIcon name="up" className="size-3.5 -rotate-90" /> Inquiries
          </Link>
          <h2 className="mt-1 text-[clamp(26px,3vw,38px)] leading-tight font-light tracking-[-0.03em] [overflow-wrap:anywhere]">
            Response to <span className="font-semibold">{item.email}</span>
          </h2>
          <p className="mt-1 text-[13.5px] text-ink/55 tabular-nums">
            {item.ref} · asked {ago(item.createdAt)}
            {item.sourcePath ? ` from ${item.sourcePath}` : ""}
          </p>
          <Link
            href={`/admin/inquiries/${encodeURIComponent(item.ref)}`}
            className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-ink/70 underline-offset-4 hover:text-ink hover:underline"
          >
            <AdminIcon name="page" className="size-3.5" /> Full record and history
          </Link>
        </div>
        <RequestState d={status} />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          {/* products */}
          <Card i={1}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[17px] font-semibold">
                Products <span className="font-normal text-ink/45 tabular-nums">· {lines.length}</span>
              </h3>
              <p className="text-[12.5px] text-ink/55">Prices per pair in USD, FOB. Your list price fills in at the right tier.</p>
            </div>
            {lines.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-white/70 p-5 text-[14px] text-ink/60">
                They asked for the full line sheet. Pick the styles to offer from the products below, or just write a message.
              </p>
            ) : (
              <>
                <div className="mt-4 hidden grid-cols-[minmax(0,1fr)_96px_80px_140px_110px_36px] gap-3 px-3 text-[12px] font-semibold text-ink/50 lg:grid">
                  <span>Product</span>
                  <span>Cases</span>
                  <span className="text-right">Pairs</span>
                  <span>Price / pair</span>
                  <span className="text-right">Total</span>
                  <span />
                </div>
                <ul className="mt-2 grid gap-2">
                  {lines.map((l) => {
                    const p = byId.get(l.productId);
                    return p ? (
                      <ProductRow
                        key={l.productId}
                        p={p}
                        line={l}
                        asked={asked.has(l.productId)}
                        list={suggest(l.productId, l.cases)}
                        onChange={(patch) => set(l.productId, patch)}
                        onRemove={() => setLines((all) => all.filter((x) => x.productId !== l.productId))}
                      />
                    ) : null;
                  })}
                </ul>
              </>
            )}
          </Card>

          <Picker products={panel.products} chosen={new Set(lines.map((l) => l.productId))} onAdd={add} />

          {/* terms and message */}
          <Card i={3}>
            <h3 className="text-[17px] font-semibold">Terms</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {TERM_FIELDS.map(([k, label]) => (
                <label key={k} htmlFor={`t-${k}`} className="grid gap-1.5 text-[12.5px] font-semibold text-ink/60">
                  {label}
                  <input id={`t-${k}`} value={terms[k]} maxLength={300} onChange={(e) => setTerms((t) => ({ ...t, [k]: e.target.value }))} className={clsx(INPUT, "font-normal text-ink")} />
                </label>
              ))}
            </div>
            <label htmlFor="t-message" className="mt-4 grid gap-1.5 text-[12.5px] font-semibold text-ink/60">
              Message to the buyer (optional)
              <textarea
                id="t-message"
                rows={5}
                value={message}
                maxLength={4000}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="A personal note: colours available, delivery window, an offer on samples…"
                className={clsx(INPUT, "resize-y py-3 leading-relaxed font-normal text-ink")}
              />
            </label>
          </Card>
        </div>

        {/* the summary and the send button stay in view while the desk works */}
        <aside className="grid gap-5 xl:sticky xl:top-6">
          {answers.length > 0 && <LatestAnswer latest={answers[0]} earlier={answers.length - 1} email={item.email} refId={item.ref} />}
          <Card i={2} tone="dark">
            <p className="text-[13px] font-semibold text-white/65">Inquiry total</p>
            {priced.length ? (
              <p className="mt-2 text-[44px] leading-none font-light tabular-nums">{usd(total)}</p>
            ) : (
              <p className="mt-2 text-[26px] leading-tight font-light text-white/80">Add prices to see the total</p>
            )}
            <p className="mt-2 text-[13px] text-white/60">
              {priced.length < lines.length && lines.length > 0 ? `${lines.length - priced.length} style${lines.length - priced.length > 1 ? "s" : ""} on request · ` : ""}
              USD, FOB
            </p>
            <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-[12px] text-white/60">
              {(
                [
                  ["Styles", lines.length],
                  ["Cases", cases],
                  ["Pairs", pairs],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className="mt-0.5 text-[20px] font-light text-white tabular-nums">{fmt(v)}</dd>
                </div>
              ))}
            </dl>
            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-[#a64b34]/25 p-3 text-[13px] font-medium text-[#ffd3c7]">
                {error}
              </p>
            )}
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(true)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white text-[14.5px] font-semibold text-ink transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                <AdminIcon name="send" className="size-4" /> {pending ? "Working…" : status?.sentAt ? "Send again" : "Send inquiry"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(false)}
                className="flex min-h-11 items-center justify-center rounded-full text-[14px] font-semibold text-white ring-1 ring-white/25 hover:bg-white/10 disabled:opacity-50"
              >
                Save draft
              </button>
            </div>
            <p className="mt-3 text-center text-[12px] text-white/50">Emailed with product photos to {item.email}. The inquiry moves to Quoted.</p>
          </Card>

          <Card i={3}>
            <h3 className="text-[15px] font-semibold">Buyer</h3>
            <dl className="mt-3 grid gap-2.5 text-[13.5px]">
              <Row k="Email">
                <a href={`mailto:${item.email}`} className="font-semibold [overflow-wrap:anywhere] hover:underline">
                  {item.email}
                </a>
              </Row>
              <Row k="Reference">
                <span className="tabular-nums">{item.ref}</span>
              </Row>
              <Row k="Asked">{new Date(item.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</Row>
              {item.sourcePath && <Row k="From page">{item.sourcePath}</Row>}
              <Row k="Their list">{item.lines.length ? `${item.lines.length} style${item.lines.length > 1 ? "s" : ""} · ${fmt(item.pairs)} pairs` : "Full line sheet"}</Row>
            </dl>
            {item.lines.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {item.lines.map((l) => {
                  const p = byId.get(l.productId);
                  return p ? (
                    <li key={l.productId} title={p.name} className="relative size-12 rounded-xl bg-white ring-1 ring-ink/5">
                      <Image src={p.image} alt={p.name} fill sizes="48px" className="object-contain p-1" />
                    </li>
                  ) : null;
                })}
              </ul>
            )}
          </Card>

          <Card i={4}>
            <h3 className="text-[15px] font-semibold">Activity</h3>
            <ul className="mt-3 grid gap-2 text-[13px] text-ink/65">
              <li>Asked {ago(item.createdAt)}</li>
              {status?.savedAt && <li>Draft saved {ago(status.savedAt)}</li>}
              {status?.sentAt && (
                <li className="font-semibold text-[#1f6b45]">
                  Sent {ago(status.sentAt)}
                  {status.sentBy ? ` by ${status.sentBy}` : ""}
                </li>
              )}
              {status?.lastError && <li className="text-[#8a3424]">Not sent: {status.lastError}</li>}
              {item.buyerResponses.map((a, i) => (
                <li key={`${a.at}-${i}`} className="flex gap-2">
                  <span aria-hidden="true" className={clsx("mt-[7px] size-1.5 shrink-0 rounded-full", ANSWER[a.action].dot)} />
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{ANSWER[a.action].short}</span> {ago(a.at)}
                    {a.message && <span className="mt-0.5 line-clamp-3 block whitespace-pre-line text-ink/60 [overflow-wrap:anywhere]">&ldquo;{a.message}&rdquo;</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** The buyer's latest answer, at the top of the right column: what they chose, when, and their message. */
function LatestAnswer({ latest, earlier, email, refId }: { latest: Answer; earlier: number; email: string; refId: string }) {
  const a = ANSWER[latest.action];
  return (
    <section aria-label="The buyer's latest answer" className={clsx("min-w-0 rounded-[28px] p-5 ring-1 motion-safe:animate-[admin-in_.6s_cubic-bezier(.22,1,.36,1)_both] sm:p-6", a.tone)}>
      <p className="flex flex-wrap items-center gap-x-2 text-[15px] font-semibold">
        <span aria-hidden="true" className={clsx("size-2 rounded-full", a.dot)} />
        {a.label}
        <span className="font-normal opacity-75">· {ago(latest.at)}</span>
      </p>
      {latest.message ? (
        <p className="mt-2.5 text-[14px] leading-relaxed whitespace-pre-line text-ink [overflow-wrap:anywhere]">{latest.message}</p>
      ) : (
        <p className="mt-2 text-[13.5px] opacity-80">No message.</p>
      )}
      <p className="mt-3 text-[12.5px] opacity-75">
        {new Date(latest.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · from the quote page
        {earlier > 0 ? ` · ${earlier} earlier in Activity` : ""}
      </p>
      <a
        href={`mailto:${email}?subject=${encodeURIComponent(`Re: your quote ${refId}`)}`}
        className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-ink/85"
      >
        <AdminIcon name="send" className="size-3.5" /> Reply to the buyer
      </a>
    </section>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
      <dt className="text-ink/50">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** One product in the response: photo, name and details, cases, pairs, price per pair (with the list price) and total. */
function ProductRow({
  p,
  line,
  asked,
  list,
  onChange,
  onRemove,
}: {
  p: PanelProduct;
  line: Line;
  asked: boolean;
  list: ReturnType<typeof priceFor>;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const id = `l-${p.id}`;
  const pairs = line.cases * PACK;
  const tier = list ? TIERS.find((t) => t.key === list.tier)?.label : null;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/85 p-3 shadow-[0_1px_2px_rgb(18_20_22/.06)] lg:grid-cols-[minmax(0,1fr)_96px_80px_140px_110px_36px]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative size-[84px] flex-none rounded-xl bg-[#f1f1ee]">
          <Image src={p.image} alt="" fill sizes="84px" className="object-contain p-1.5" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{p.name}</span>
            {asked && <span className="flex-none rounded-full bg-[#984080]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7a3366]">Asked</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink/55">
            <span className="size-3 flex-none rounded-full ring-1 ring-ink/15" style={{ background: p.base.color.hex }} />
            <span className="truncate">
              {p.base.color.name} · {p.type}
            </span>
          </span>
          <span className="block truncate text-[12.5px] text-ink/50">
            {p.base.sizes} · {PACK} pairs per case
          </span>
        </span>
      </div>

      <button type="button" onClick={onRemove} aria-label={`Remove ${p.name}`} className="grid size-9 place-items-center justify-self-end rounded-full text-ink/45 hover:bg-ink/[0.06] hover:text-ink lg:order-last">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.8]">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      <div className="col-span-2 grid grid-cols-[96px_1fr_1fr] items-end gap-3 lg:col-span-4 lg:grid-cols-[96px_80px_140px_110px] lg:items-center">
        <label htmlFor={`${id}-cases`} className="grid gap-1 text-[11.5px] font-semibold text-ink/50 lg:block">
          <span className="lg:sr-only">Cases</span>
          <input
            id={`${id}-cases`}
            type="number"
            min={1}
            step={1}
            value={line.cases}
            onChange={(e) => onChange({ cases: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
            className={clsx(INPUT, "text-ink tabular-nums")}
          />
        </label>
        <span className="pb-3 text-right text-[14px] tabular-nums lg:pb-0">
          <span className="block text-[11.5px] font-semibold text-ink/50 lg:hidden">Pairs</span>
          {fmt(pairs)}
        </span>
        <div className="grid gap-1">
          <label htmlFor={`${id}-price`} className="text-[11.5px] font-semibold text-ink/50 lg:sr-only">
            Price / pair
          </label>
          <span className="flex items-center rounded-xl bg-white pl-3 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink">
            <span className="text-[13px] text-ink/45">$</span>
            <input
              id={`${id}-price`}
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              placeholder="On request"
              value={line.price ?? ""}
              onChange={(e) => onChange({ price: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
              className="min-h-11 w-full min-w-0 bg-transparent px-1.5 text-[14px] tabular-nums outline-none placeholder:text-ink/35"
            />
          </span>
          {list &&
            (line.price === list.price ? (
              <span className="text-[11.5px] text-ink/45">List price, {tier}</span>
            ) : (
              <button type="button" onClick={() => onChange({ price: list.price })} className="justify-self-start text-[11.5px] font-semibold text-ink/55 underline hover:text-ink">
                Use list {usd(list.price)}
              </button>
            ))}
        </div>
        <span className="col-span-3 text-right text-[15px] font-semibold tabular-nums lg:col-span-1">
          {line.price !== null ? usd(line.price * pairs) : <span className="text-[13px] font-medium text-ink/45">On request</span>}
        </span>
      </div>
    </li>
  );
}

/** Every product with its photo, searchable and by line, to add to the response. */
function Picker({ products, chosen, onAdd }: { products: PanelProduct[]; chosen: Set<string>; onAdd: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [line, setLine] = useState("all");
  const [more, setMore] = useState(false);
  const lines = useMemo(() => [...new Set(products.map((p) => p.base.line))], [products]);
  const words = q.trim().toLowerCase();
  const found = products.filter(
    (p) => (line === "all" || p.base.line === line) && (!words || `${p.name} ${p.type} ${p.base.color.name}`.toLowerCase().includes(words)),
  );
  const shown = more ? found : found.slice(0, PICK);
  return (
    <Card i={2}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold">Add products</h3>
        <label htmlFor="pick-q" className="sr-only">
          Search products
        </label>
        <input id="pick-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, type or colour" className={clsx(INPUT, "max-w-[280px]")} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Line">
        {["all", ...lines].map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={line === l}
            onClick={() => setLine(l)}
            className={clsx(
              "min-h-9 rounded-full px-3.5 text-[13px] font-semibold capitalize transition-colors",
              line === l ? "bg-ink text-white" : "bg-white/80 text-ink/65 ring-1 ring-ink/10 hover:text-ink",
            )}
          >
            {l === "all" ? "All" : l}
          </button>
        ))}
      </div>
      {found.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-ink/55">No products match.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {shown.map((p) => {
            const on = chosen.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={on}
                  onClick={() => onAdd(p.id)}
                  className={clsx(
                    "group grid w-full gap-2 rounded-2xl bg-white/85 p-2.5 text-left ring-1 transition-[transform,box-shadow]",
                    on ? "ring-ink/30" : "ring-transparent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-12px_rgb(18_20_22/.4)]",
                  )}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#f1f1ee]">
                    <Image src={p.image} alt="" fill sizes="(min-width: 1536px) 170px, (min-width: 1024px) 200px, 45vw" className="object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
                    <span
                      className={clsx(
                        "absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full text-[15px] font-semibold",
                        on ? "bg-ink text-white" : "bg-white text-ink shadow-[0_1px_3px_rgb(18_20_22/.2)]",
                      )}
                    >
                      {on ? "✓" : "+"}
                    </span>
                  </span>
                  <span className="min-w-0 px-0.5">
                    <span className="block truncate text-[13.5px] font-semibold">{p.name}</span>
                    <span className="block truncate text-[12px] text-ink/50">
                      {p.base.color.name} · {p.type}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {found.length > PICK && (
        <button type="button" onClick={() => setMore((m) => !m)} className="mt-3 min-h-10 rounded-full bg-white/80 px-4 text-[13px] font-semibold ring-1 ring-ink/10 hover:bg-white">
          {more ? "Show fewer" : `Show all ${found.length}`}
        </button>
      )}
    </Card>
  );
}
