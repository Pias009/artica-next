import type { Metadata } from "next";
import Image from "next/image";
import { PrintButton } from "./PrintButton";
import { requireAdmin } from "@/lib/admin/auth";
import { sizeRange } from "@/lib/buyer-desk";
import { COMPANY } from "@/lib/company";
import { loadContent } from "@/lib/content/store";
import { byId, CASE_PACK, categoryOf, LEAD, LINE_LABEL, MOQ_CASES, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN, type Product } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Line sheet" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "").trim();

/**
 * A wholesale line sheet for the styles ticked in Products (?ids=…), optionally titled and made out to a buyer
 * (?title=…&for=…): an A4 page to print or save as PDF and attach to a reply. Live styles only, with the admin's
 * edits; prices stay out (the desk quotes them).
 */
export default async function LineSheet({ searchParams }: PageProps<"/admin/line-sheet">) {
  await requireAdmin();
  await loadContent();
  const sp = await searchParams;
  const ids = one(sp.ids).split(",").filter((id) => /^[\w-]{1,40}$/.test(id)).slice(0, 60);
  const styles = ids.map((id) => byId[id]).filter((p): p is Product => !!p);
  const title = one(sp.title).slice(0, 80) || "Wholesale line sheet";
  const buyer = one(sp.for).slice(0, 80);
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const skipped = ids.length - styles.length;

  return (
    <main className="mx-auto max-w-[1000px] bg-white px-8 py-8 text-ink print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 12mm; } @media print { body { background: #fff !important; } .no-print { display: none !important; } .sheet-card { break-inside: avoid; } }`}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-tile px-4 py-3 text-[13.5px]">
        <span>
          {styles.length} {styles.length === 1 ? "style" : "styles"}
          {skipped > 0 && <span className="text-ink-2"> · {skipped} left out (hidden or not found)</span>}. Print it, or choose “Save as PDF” in the print window.
        </span>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between gap-6 border-b border-line pb-5">
        <div>
          <Image src="/images/chime-long-logo.png" alt="Chime Long" width={150} height={44} className="h-11 w-auto" />
          <h1 className="mt-4 font-headline text-[30px] leading-tight font-semibold">{title}</h1>
          {buyer && <p className="mt-1 text-[15px] text-ink-2">Prepared for {buyer}</p>}
        </div>
        <div className="text-right text-[12.5px] leading-relaxed text-ink-2">
          <p className="font-semibold text-ink">{COMPANY.name}</p>
          <p>{COMPANY.email.general}</p>
          <p>{COMPANY.phone}</p>
          <p className="mt-1">{date}</p>
        </div>
      </header>

      <dl className="my-5 grid grid-cols-5 gap-2 text-[12px]">
        {[
          ["Minimum order", `${MOQ_PAIRS} pairs (${MOQ_CASES} cases) per style and colour`],
          ["Case pack", `${PACK} pairs, mixed sizes`],
          ["Samples", `about ${LEAD.samples.replace("d", "")} days`],
          ["Production", `about ${LEAD.bulk.replace("d", "")} days`],
          ["Private label", `from ${PRIVATE_LABEL_MIN} pairs`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-tile px-3 py-2">
            <dt className="font-semibold">{k}</dt>
            <dd className="text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>

      {styles.length ? (
        <ul className="grid grid-cols-3 gap-3 print:grid-cols-4 print:gap-2">
          {styles.map((p) => (
            <li key={p.id} className="sheet-card overflow-hidden rounded-2xl border border-line">
              <div className="relative aspect-[4/3] bg-tile print:aspect-[3/2]">
                {p.outer.src && <Image src={p.outer.src} alt={p.name} fill sizes="320px" className="object-contain p-3" />}
                {p.badge && <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-semibold text-white">{p.badge}</span>}
              </div>
              <div className="p-3 text-[12px] leading-snug print:p-2 print:text-[10.5px]">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold">{p.name}</span>
                  <span className="text-[11px] text-ink-2">{p.id.toUpperCase()}</span>
                </p>
                <p className="text-ink-2">
                  {LINE_LABEL[p.line]} · {categoryOf(p) ?? p.type}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5">
                  <span className="size-3 rounded-full ring-1 ring-ink/15" style={{ background: p.color.hex }} />
                  {p.color.name}
                  {p.rating && <span className="text-ink-2">· rated {p.rating}</span>}
                </p>
                <p className="mt-1.5">{p.type}</p>
                <p className="text-ink-2">{p.materials.slice(0, 2).map((m) => `${m.label}: ${m.value}`).join(" · ")}</p>
                <p className="mt-1.5">
                  <b className="font-semibold">Sizes</b> {p.sizes} · {sizeRange(p.line)}
                </p>
                <p className="text-ink-2">Per case: {CASE_PACK[p.line].map(([s, n]) => `${s}×${n}`).join(" ")}</p>
                <p className="mt-1.5 text-[11px] break-all text-ink-2">{absoluteUrl(`/products/${p.slug}`)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-tile p-6 text-[14px] text-ink-2">No live styles were chosen. Tick styles in Products, then choose Line sheet.</p>
      )}

      <footer className="mt-6 border-t border-line pt-4 text-[12px] text-ink-2">
        Tier pricing from the trade desk within {LEAD.quote.replace("h", "")} hours: reply to this email or write to {COMPANY.email.general}. Payment 30% deposit, 70% against
        the bill of lading. Sizes, colours and materials are confirmed with your samples.
      </footer>
    </main>
  );
}
