"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { ago, usePanel } from "../../panel-data";
import { AdminIcon, Card } from "../../ui";
import type { PanelInquiry } from "@/lib/admin/panel";

const SENT_SHOWN = 8;

/**
 * Email requests: buyers who left only an email (the "Ask inquiry" box, /send-inquiry). Each waits here until the desk
 * opens it, adds the products, prices and terms on its own page (RequestResponse) and sends it; sent ones stay below.
 */
export function EmailRequests({ items }: { items: PanelInquiry[] }) {
  const panel = usePanel();
  const images = useMemo(() => new Map(panel.products.map((p) => [p.id, p.image])), [panel.products]);
  const requests = items.filter((i) => i.request);
  const waiting = requests.filter((r) => !r.details?.sentAt);
  const sent = requests.filter((r) => r.details?.sentAt).slice(0, SENT_SHOWN);

  return (
    <Card i={3} className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-semibold">
          Email requests{" "}
          {waiting.length > 0 && (
            <span className="ml-1 rounded-full bg-[#b45309]/12 px-2 py-0.5 align-middle text-[12px] font-semibold text-[#8a3b0a] tabular-nums">{waiting.length} to send</span>
          )}
        </h2>
        <p className="text-[12.5px] text-ink/55">Buyers who left only an email. Open one, add the products and prices, then send.</p>
      </div>

      {requests.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-ink/[0.04] p-4 text-[13.5px] text-ink/60">
          No email requests yet. When a buyer leaves their email in the &ldquo;Ask inquiry&rdquo; box, it lands here for you to fill in and send.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {[...waiting, ...sent].map((r) => (
            <li key={r.ref}>
              <Link
                href={`/admin/inquiries/requests/${r.ref}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/85 p-3 shadow-[0_1px_2px_rgb(18_20_22/.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-12px_rgb(18_20_22/.4)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{r.email}</span>
                  <span className="block truncate text-[12px] text-ink/50 tabular-nums">
                    {r.ref} · {ago(r.createdAt)}
                    {r.sourcePath ? ` · from ${r.sourcePath}` : ""}
                  </span>
                </span>
                <span className="hidden min-w-0 items-center gap-2 md:flex">
                  <span className="flex -space-x-2">
                    {r.lines.slice(0, 3).map((l) =>
                      images.get(l.productId) ? (
                        <span key={l.productId} className="relative size-9 rounded-lg bg-[#f1f1ee] ring-2 ring-white">
                          <Image src={images.get(l.productId)!} alt="" fill sizes="36px" className="object-contain p-0.5" />
                        </span>
                      ) : null,
                    )}
                  </span>
                  <span className="truncate text-[13px] text-ink/70">
                    {r.styles.length ? `${r.styles.length} style${r.styles.length > 1 ? "s" : ""} · ${r.pairs.toLocaleString("en-US")} pairs` : "Full line sheet"}
                  </span>
                </span>
                <RequestState d={r.details} />
                <AdminIcon name="up" className="hidden size-4 rotate-90 text-ink/40 md:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Where a request stands: waiting for details, a saved draft, sent, or a send that failed. */
export function RequestState({ d }: { d: PanelInquiry["details"] }) {
  const [text, tone] = !d ? ["Needs details", "warn"] : d.sentAt ? [`Sent ${ago(d.sentAt)}`, "good"] : d.lastError ? ["Not sent", "bad"] : ["Draft saved", "info"];
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
