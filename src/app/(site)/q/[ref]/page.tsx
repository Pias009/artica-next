import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteActions } from "@/components/quote/QuoteActions";
import { dbReady, inquiries, type BuyerAction, type InquiryDoc } from "@/lib/leads/db";
import { quoteTokenOk } from "@/lib/leads/quote-link";

// the link is the buyer's own: never indexed, and not followed from here either
export const metadata: Metadata = { title: "Your quote", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ ref: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Quote = Pick<InquiryDoc, "ref" | "company" | "createdAt" | "lines" | "pairs" | "details" | "buyerResponses">;

const REF = /^CL-\d{4}-\d{4,}$/;
const money = (x: number) => `$${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (x: number) => x.toLocaleString("en-US");
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Site photos and the studio's Cloudinary shots go through next/image's optimizer; anything else is shown as is. */
const optimizable = (src: string) => src.startsWith("/") || (src.startsWith("https://res.cloudinary.com/doulxmmm/image/upload/") && !src.includes("?"));

const ANSWERED: Record<BuyerAction, string> = {
  accept: "You accepted this quote",
  samples: "You asked for samples",
  question: "You asked a question",
};

/**
 * The buyer's quote page, linked from the details email (detailsEmail in lib/leads/mail.ts). The signed link
 * (lib/leads/quote-link.ts) is the only way in: a wrong or missing token is a 404, so refs can't be guessed. It shows
 * what the desk sent (styles with photos, prices, total, terms, message) and three answers that update the inquiry in
 * the admin panel (respondToQuote in app/quote-actions.ts). Until the details are sent it says the quote is coming.
 */
export default async function QuotePage({ params, searchParams }: Props) {
  const { ref } = await params;
  const t = (await searchParams).t;
  const token = typeof t === "string" ? t : "";
  if (!REF.test(ref) || !quoteTokenOk(ref, token) || !dbReady()) notFound();

  const q = await inquiries().findOne<Quote>(
    { ref },
    { projection: { _id: 0, ref: 1, company: 1, createdAt: 1, lines: 1, pairs: 1, details: 1, buyerResponses: 1 } },
  );
  if (!q) notFound();

  // what was emailed, not a draft the desk saved afterwards (older inquiries have no copy: then the saved details)
  const d = q.details?.sentAt ? { ...q.details, ...(q.details.sent ?? {}) } : null;
  const name = q.company && !q.company.includes("@") ? q.company : null;
  const answers = [...(q.buyerResponses ?? [])].reverse();
  const accepted = answers.find((a) => a.action === "accept");

  return (
    <div className="pt-10 pb-24 md:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b border-line pb-8">
        <div className="min-w-0">
          <p className="type-label text-brand tabular-nums">Quote {q.ref}</p>
          <h1 className="mt-3 font-headline text-[clamp(36px,4.6vw,60px)] leading-[1.04] font-semibold tracking-[-0.02em]">
            {d ? (name ? `Your quote, ${name}` : "Your quote") : "Your quote is being prepared"}
          </h1>
          <p className="mt-4 max-w-[56ch] text-[17px] text-ink-2">
            {d
              ? `Prepared by the Chime Long trade desk in Guangzhou and sent ${day(d.sentAt!)}. Prices are per pair in US dollars, FOB.`
              : `The trade desk in Guangzhou is putting together the prices and terms for your inquiry of ${day(q.createdAt)}. We'll email you as soon as it's ready, usually within one working day.`}
          </p>
        </div>
        {accepted && (
          <p className="rounded-full bg-sage px-4 py-2 text-[14px] font-semibold text-[#1f6b45]">
            Accepted {day(accepted.at)}
          </p>
        )}
      </header>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
        <div className="grid min-w-0 gap-10">
          {d ? <QuoteBody d={d} /> : <Preparing q={q} />}

          {answers.length > 0 && (
            <section aria-labelledby="your-answers">
              <h2 id="your-answers" className="h-sec">
                Your messages
              </h2>
              <ul className="mt-4 grid gap-3">
                {answers.map((a, i) => (
                  <li key={`${a.at.getTime()}-${i}`} className="rounded-card bg-tile p-4">
                    <p className="text-[14px] font-semibold">
                      {ANSWERED[a.action]} <span className="font-normal text-muted">· {day(a.at)}</span>
                    </p>
                    {a.message && <p className="mt-1.5 text-[15px] whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">{a.message}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* the total and the answers stay in view on wide screens while the buyer reads the styles */}
        <aside className="grid gap-5 lg:sticky lg:top-28">
          {d && <Summary d={d} />}
          <section aria-labelledby="answer" className="rounded-shell bg-white p-6 ring-1 ring-line">
            <h2 id="answer" className="font-headline text-[24px] leading-tight font-semibold">
              {d ? "Ready to go ahead?" : "A question in the meantime?"}
            </h2>
            <p className="mt-2 text-[15px] text-ink-2">
              {d ? "Answer here and the trade desk is told at once. You can also reply to our email." : "Ask here and the trade desk will answer by email."}
            </p>
            <div className="mt-5">
              <QuoteActions refId={q.ref} token={token} actions={d ? ["accept", "samples", "question"] : ["question"]} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

type Sent = NonNullable<InquiryDoc["details"]>;

function totals(d: Sent) {
  const priced = d.lines.filter((l) => l.price !== null);
  return {
    priced: priced.length,
    total: priced.reduce((a, l) => a + l.price! * l.pairs, 0),
    pairs: d.lines.reduce((a, l) => a + l.pairs, 0),
    cases: d.lines.reduce((a, l) => a + l.cases, 0),
  };
}

function QuoteBody({ d }: { d: Sent }) {
  const x = totals(d);
  const terms = (
    [
      ["Lead time", d.leadTime],
      ["Samples", d.samples],
      ["Payment", d.payment],
      ["Shipping", d.shipping],
    ] as const
  ).filter(([, v]) => v);

  return (
    <>
      {d.message && (
        <section aria-label="Message from the trade desk" className="rounded-shell border-l-4 border-brand bg-brand-soft p-6">
          <p className="type-label text-brand">From the trade desk</p>
          <p className="mt-2 text-[16px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{d.message}</p>
        </section>
      )}

      {d.lines.length > 0 && (
        <section aria-labelledby="styles">
          <h2 id="styles" className="h-sec">
            Styles <span className="font-normal text-muted">· {d.lines.length}</span>
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {d.lines.map((l) => (
              <li key={l.productId} className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-2 py-5 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:gap-x-6">
                <div className="relative aspect-square overflow-hidden rounded-ph bg-photo">
                  {l.image && (
                    <Image src={l.image} alt={`${l.name}, ${l.color}`} fill sizes="112px" unoptimized={!optimizable(l.image)} className="object-contain p-2" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] leading-snug font-semibold">{l.name}</p>
                  <p className="mt-1 text-[14px] text-ink-2">
                    {l.color} · Sizes {l.sizes}
                  </p>
                  <p className="mt-1 text-[14px] text-muted tabular-nums">
                    {fmt(l.cases)} {l.cases === 1 ? "case" : "cases"} · {fmt(l.pairs)} pairs
                    {l.price !== null && ` · ${money(l.price)} per pair`}
                  </p>
                </div>
                <p className="col-start-2 text-[17px] font-semibold tabular-nums sm:col-start-3 sm:text-right">
                  {l.price !== null ? money(l.price * l.pairs) : <span className="text-[14px] font-medium text-muted">Price on request</span>}
                </p>
              </li>
            ))}
          </ul>
          {x.priced > 0 && (
            <div className="flex items-end justify-between gap-4 pt-5">
              <p className="text-[15px] text-ink-2">
                {x.priced === d.lines.length ? "Order total" : "Total for the priced styles"} · {fmt(x.pairs)} pairs
                <span className="block text-[13px] text-muted">USD, FOB</span>
              </p>
              <p className="text-[28px] leading-none font-semibold tabular-nums">{money(x.total)}</p>
            </div>
          )}
        </section>
      )}

      {terms.length > 0 && (
        <section aria-labelledby="terms" className="rounded-shell bg-tile p-6">
          <h2 id="terms" className="h-sec">
            Terms
          </h2>
          <dl className="mt-4 grid gap-3 text-[15px]">
            {terms.map(([k, v]) => (
              <div key={k} className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4">
                <dt className="font-semibold">{k}</dt>
                <dd className="text-ink-2 [overflow-wrap:anywhere]">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}

function Summary({ d }: { d: Sent }) {
  const x = totals(d);
  return (
    <section aria-label="Quote summary" className="rounded-shell bg-ink p-6 text-white">
      <p className="text-[13px] font-semibold text-white/65">{x.priced === d.lines.length ? "Order total" : "Total for the priced styles"}</p>
      {x.priced > 0 ? (
        <p className="mt-2 text-[44px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{money(x.total)}</p>
      ) : (
        <p className="mt-2 text-[24px] leading-tight font-semibold">Prices on request</p>
      )}
      <p className="mt-2 text-[13px] text-white/65">
        {x.priced < d.lines.length && d.lines.length > 0 ? `${d.lines.length - x.priced} on request · ` : ""}USD, FOB
      </p>
      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-[12px] text-white/65">
        {(
          [
            ["Styles", d.lines.length],
            ["Cases", x.cases],
            ["Pairs", x.pairs],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="mt-0.5 text-[20px] font-semibold text-white tabular-nums">{fmt(v)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Preparing({ q }: { q: Quote }) {
  return (
    <section aria-labelledby="asked" className="rounded-shell bg-studio p-[clamp(20px,4vw,32px)]">
      <h2 id="asked" className="h-sec">
        What happens next
      </h2>
      <ol className="mt-4 grid gap-3 text-[15px] text-ink-2">
        <li>
          <span className="font-semibold text-ink">1. Prices and terms.</span> The desk checks factory prices, lead times and samples for {q.lines.length ? "the styles you picked" : "the styles that fit your inquiry"}.
        </li>
        <li>
          <span className="font-semibold text-ink">2. Your quote by email.</span> You&apos;ll get it with photos, and this page will show it.
        </li>
        <li>
          <span className="font-semibold text-ink">3. Answer in one click.</span> Accept it, ask for samples or ask a question, right here.
        </li>
      </ol>
      {q.lines.length > 0 && (
        <p className="mt-5 text-[14px] text-muted">
          You asked about {q.lines.length} {q.lines.length === 1 ? "style" : "styles"}
          {q.pairs ? `, ${fmt(q.pairs)} pairs` : ""}.
        </p>
      )}
      <Link href="/catalog" className="btn btn-line mt-6">
        Browse the catalogue
      </Link>
    </section>
  );
}
