"use client";

import clsx from "clsx";
import { useMemo, useState, useTransition } from "react";
import { ago, usePanel } from "../../panel-data";
import { AdminIcon, Card, flash, Sheet } from "../../ui";
import { saveDetailsAction, type DetailsInput } from "@/app/admin/request-actions";
import { priceFor, usd } from "@/lib/admin/prices";
import type { PanelInquiry } from "@/lib/admin/panel";
import { LEAD, MOQ_CASES, PACK } from "@/lib/products";

/** Suggested terms for a new set of details: the site's own (product pages, FAQ); the desk edits them per buyer. */
const TERMS = {
  leadTime: `About ${LEAD.bulk.replace("d", "")} days of production after you confirm`,
  samples: `About ${LEAD.samples.replace("d", "")} days, one pair per style`,
  payment: "30% deposit on order confirmation, 70% balance against the bill of lading",
  shipping: "FOB Guangzhou; DDP or EXW on request",
};
const SENT_SHOWN = 8;

type Details = NonNullable<PanelInquiry["details"]>;

/**
 * Email requests: buyers who left only an email (the "Ask inquiry" box, /send-inquiry). Each waits here until the desk
 * adds the styles, prices and terms and sends them (app/admin/request-actions.ts); sent ones stay below for a resend.
 */
export function EmailRequests({ items, onChange }: { items: PanelInquiry[]; onChange: (ref: string, patch: Partial<PanelInquiry>) => void }) {
  const [openRef, setOpenRef] = useState<string | null>(null);
  const requests = items.filter((i) => i.request);
  const waiting = requests.filter((r) => !r.details?.sentAt);
  const sent = requests.filter((r) => r.details?.sentAt).slice(0, SENT_SHOWN);
  const open = requests.find((r) => r.ref === openRef) ?? null;

  return (
    <Card i={3} className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-semibold">
          Email requests{" "}
          {waiting.length > 0 && (
            <span className="ml-1 rounded-full bg-[#b45309]/12 px-2 py-0.5 align-middle text-[12px] font-semibold text-[#8a3b0a] tabular-nums">{waiting.length} to send</span>
          )}
        </h2>
        <p className="text-[12.5px] text-ink/55">Buyers who left only an email. Add the details, then send them the inquiry.</p>
      </div>

      {requests.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-ink/[0.04] p-4 text-[13.5px] text-ink/60">
          No email requests yet. When a buyer leaves their email in the &ldquo;Ask inquiry&rdquo; box, it lands here for you to fill in and send.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {[...waiting, ...sent].map((r) => (
            <li key={r.ref}>
              <button
                type="button"
                onClick={() => setOpenRef(r.ref)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/85 p-3 text-left shadow-[0_1px_2px_rgb(18_20_22/.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-12px_rgb(18_20_22/.4)] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{r.email}</span>
                  <span className="block truncate text-[12px] text-ink/50 tabular-nums">
                    {r.ref} · {ago(r.createdAt)}
                    {r.sourcePath ? ` · from ${r.sourcePath}` : ""}
                  </span>
                </span>
                <span className="hidden truncate text-[13px] text-ink/70 sm:block">
                  {r.styles.length ? `${r.styles.length} style${r.styles.length > 1 ? "s" : ""} · ${r.pairs.toLocaleString("en-US")} pairs` : "Full line sheet"}
                </span>
                <State d={r.details} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!open} onClose={() => setOpenRef(null)} title="Send inquiry details">
        {open && (
          <DetailsForm
            key={open.ref}
            item={open}
            onSaved={(details, sentNow) => {
              onChange(open.ref, { details, ...(sentNow && { status: "quoted" as const }) });
              if (sentNow) setOpenRef(null);
            }}
          />
        )}
      </Sheet>
    </Card>
  );
}

function State({ d }: { d: PanelInquiry["details"] }) {
  const [text, tone] = !d
    ? ["Needs details", "warn"]
    : d.sentAt
      ? [`Sent ${ago(d.sentAt)}`, "good"]
      : d.lastError
        ? ["Not sent", "bad"]
        : ["Draft saved", "info"];
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
        tone === "warn" && "bg-[#b45309]/12 text-[#8a3b0a]",
        tone === "good" && "bg-[#2f8f5b]/12 text-[#1f6b45]",
        tone === "bad" && "bg-[#a64b34]/12 text-[#8a3424]",
        tone === "info" && "bg-ink/[0.07] text-ink/70",
      )}
    >
      {text}
    </span>
  );
}

type Line = { productId: string; cases: number; price: number | null };

const INPUT = "min-h-10 w-full rounded-xl bg-white px-3 text-[14px] ring-1 ring-ink/10 outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-ink";

/** The details for one request: styles with cases and price per pair, the terms and a message; save or send. */
function DetailsForm({ item, onSaved }: { item: PanelInquiry; onSaved: (d: Details, sentNow: boolean) => void }) {
  const panel = usePanel();
  const byId = useMemo(() => new Map(panel.products.map((p) => [p.id, p])), [panel.products]);
  const prices = panel.content.prices;
  const suggest = (productId: string, cases: number) => priceFor(prices[productId], cases * PACK)?.price ?? null;

  const saved = item.details;
  const [lines, setLines] = useState<Line[]>(
    () => saved?.lines ?? item.lines.filter((l) => byId.has(l.productId)).map((l) => ({ ...l, price: suggest(l.productId, l.cases) })),
  );
  const [terms, setTerms] = useState({
    leadTime: saved?.leadTime ?? TERMS.leadTime,
    samples: saved?.samples ?? TERMS.samples,
    payment: saved?.payment ?? TERMS.payment,
    shipping: saved?.shipping ?? TERMS.shipping,
  });
  const [message, setMessage] = useState(saved?.message ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (id: string, patch: Partial<Line>) => setLines((all) => all.map((l) => (l.productId === id ? { ...l, ...patch } : l)));
  const pairs = lines.reduce((a, l) => a + l.cases * PACK, 0);
  const priced = lines.filter((l) => l.price !== null);
  const total = priced.reduce((a, l) => a + l.price! * l.cases * PACK, 0);
  const left = panel.products.filter((p) => !lines.some((l) => l.productId === p.id));

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
        sentAt: r.ok && r.sent ? r.at : (saved?.sentAt ?? null),
        sentBy: saved?.sentBy ?? null,
        lastError: r.ok ? null : r.error,
      };
      if (r.ok) {
        flash(r.sent ? `Details sent to ${item.email}` : "Draft saved");
        onSaved(next, r.sent);
      } else {
        setError(r.error);
        if (r.saved) onSaved(next, false);
      }
    });

  return (
    <div className="grid gap-5">
      <div className="rounded-3xl bg-white/80 p-4">
        <p className="text-[12px] text-ink/45 tabular-nums">
          {item.ref} · asked {ago(item.createdAt)}
          {item.sourcePath ? ` from ${item.sourcePath}` : ""}
        </p>
        <p className="mt-1 text-[15px] font-semibold [overflow-wrap:anywhere]">To: {item.email}</p>
        {saved?.sentAt && (
          <p className="mt-2 text-[12.5px] text-[#1f6b45]">
            Sent {ago(saved.sentAt)}
            {saved.sentBy ? ` by ${saved.sentBy}` : ""}. Sending again emails the buyer a new copy.
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-ink/70">Styles and prices</p>
        {lines.length === 0 && (
          <p className="mb-2 rounded-2xl bg-ink/[0.04] p-3 text-[13px] text-ink/60">They asked for the full line sheet. Add the styles to price, or just write a message.</p>
        )}
        <ul className="grid gap-2">
          {lines.map((l) => {
            const p = byId.get(l.productId);
            if (!p) return null;
            const id = `${item.ref}-${l.productId}`;
            return (
              <li key={l.productId} className="rounded-2xl bg-white/85 p-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small admin thumbnail */}
                  <img src={p.image} alt="" className="size-11 flex-none rounded-lg bg-[#f1f1ee] object-contain p-1" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{p.name}</span>
                    <span className="block truncate text-[12px] text-ink/50">
                      {p.base.color.name} · {p.base.sizes}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLines((all) => all.filter((x) => x.productId !== l.productId))}
                    aria-label={`Remove ${p.name}`}
                    className="grid size-8 place-items-center rounded-full text-ink/50 hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.8]">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <label htmlFor={`${id}-cases`} className="grid gap-1 text-[12px] text-ink/55">
                    Cases
                    <input
                      id={`${id}-cases`}
                      type="number"
                      min={1}
                      step={1}
                      value={l.cases}
                      onChange={(e) => set(l.productId, { cases: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                      className={clsx(INPUT, "w-20 tabular-nums")}
                    />
                  </label>
                  <label htmlFor={`${id}-price`} className="grid gap-1 text-[12px] text-ink/55">
                    Price per pair (USD)
                    <input
                      id={`${id}-price`}
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      placeholder="On request"
                      value={l.price ?? ""}
                      onChange={(e) => set(l.productId, { price: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                      className={clsx(INPUT, "w-32 tabular-nums")}
                    />
                  </label>
                  <span className="ml-auto pb-2 text-right text-[12.5px] text-ink/60 tabular-nums">
                    {(l.cases * PACK).toLocaleString("en-US")} pairs
                    {l.price !== null && <b className="block text-[14px] text-ink">{usd(l.price * l.cases * PACK)}</b>}
                  </span>
                </div>
                {l.price === null && suggest(l.productId, l.cases) !== null && (
                  <button type="button" onClick={() => set(l.productId, { price: suggest(l.productId, l.cases) })} className="mt-1 text-[12px] font-semibold text-ink/60 underline">
                    Use your list price ({usd(suggest(l.productId, l.cases)!)})
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <label htmlFor={`${item.ref}-add`} className="sr-only">
          Add a style
        </label>
        <select
          id={`${item.ref}-add`}
          value=""
          onChange={(e) => {
            const pid = e.target.value;
            if (pid) setLines((all) => [...all, { productId: pid, cases: MOQ_CASES, price: suggest(pid, MOQ_CASES) }]);
          }}
          className={clsx(INPUT, "mt-2")}
        >
          <option value="">+ Add a style…</option>
          {left.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.base.color.name})
            </option>
          ))}
        </select>
        {lines.length > 0 && (
          <p className="mt-3 flex justify-between rounded-2xl bg-ink px-4 py-3 text-[13.5px] text-white tabular-nums">
            <span>
              {lines.length} style{lines.length > 1 ? "s" : ""} · {pairs.toLocaleString("en-US")} pairs
            </span>
            <b>{priced.length ? `${usd(total)}${priced.length < lines.length ? " (priced styles)" : ""}` : "No prices yet"}</b>
          </p>
        )}
      </div>

      <div className="grid gap-3">
        <p className="text-[12.5px] font-semibold text-ink/70">Terms</p>
        {(
          [
            ["leadTime", "Lead time"],
            ["samples", "Samples"],
            ["payment", "Payment"],
            ["shipping", "Shipping"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} htmlFor={`${item.ref}-${k}`} className="grid gap-1 text-[12px] text-ink/55">
            {label}
            <input id={`${item.ref}-${k}`} value={terms[k]} onChange={(e) => setTerms((t) => ({ ...t, [k]: e.target.value }))} maxLength={300} className={INPUT} />
          </label>
        ))}
        <label htmlFor={`${item.ref}-msg`} className="grid gap-1 text-[12px] text-ink/55">
          Message to the buyer <span className="sr-only">(optional)</span>
          <textarea
            id={`${item.ref}-msg`}
            rows={4}
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional: a personal note, colours available, the line sheet link…"
            className={clsx(INPUT, "resize-y py-2.5 leading-relaxed")}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-[#a64b34]/10 p-3 text-[13px] font-medium text-[#8a3424]">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-1 grid gap-2 bg-[#f4f4f2]/95 px-1 pt-2 pb-1 sm:grid-cols-[auto_minmax(0,1fr)]">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(false)}
          className="flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-[14px] font-semibold ring-1 ring-ink/15 disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(true)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
        >
          <AdminIcon name="send" className="size-4" /> {pending ? "Sending…" : saved?.sentAt ? "Send again" : "Send inquiry"}
        </button>
      </div>
      <p className="-mt-3 text-center text-[12px] text-ink/50">It goes to {item.email}; their reply comes to the desk inbox. The inquiry moves to Quoted.</p>
    </div>
  );
}
