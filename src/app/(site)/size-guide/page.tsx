import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { PageIntro } from "@/components/PageIntro";
import { SectionHead } from "@/components/ui/SectionHead";
import { SIZE_CHART, sizeRange, sizeTable } from "@/lib/buyer-desk";
import { LINE_LABEL, PACK, type ProductLine } from "@/lib/products";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Shoe size guide: US, EU, UK and cm",
  description: `Wholesale boot sizes in US, EU, UK and centimetres for men, women and kids, with the pairs of each size in a ${PACK}-pair case.`,
  path: "/size-guide",
});

const LINES: ProductLine[] = ["men", "women", "kids"];

/** One boot per line beside the title, each with a mid-run size in both systems. */
const TRIO: { line: ProductLine; src: string; us: string }[] = [
  { line: "men", src: "/images/workshop-boot-men.webp", us: "9" },
  { line: "women", src: "/images/workshop-boot-women.webp", us: "7" },
  { line: "kids", src: "/images/workshop-boot-kids.webp", us: "1" },
];

function SizeTrio() {
  return (
    <ul className="grid grid-cols-3 gap-2.5">
      {TRIO.map((t) => {
        const eu = SIZE_CHART[t.line].find((r) => r.us === t.us)!.eu;
        return (
          <li key={t.line} className="flex flex-col overflow-hidden rounded-card bg-white/70">
            <span className="relative block aspect-[4/5]">
              <Image src={t.src} alt="" fill priority sizes="(min-width: 1024px) 180px, 33vw" className="object-contain p-[12%] drop-shadow-boot" />
            </span>
            <span className="px-3 pb-3 text-center">
              <b className="block text-[14px] font-semibold">{LINE_LABEL[t.line]}</b>
              <span className="block text-[13px] text-ink-2 tabular-nums">
                US {t.us} = EU {eu}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function SizeGuidePage() {
  return (
    <>
      <PageIntro
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/buyer-desk", label: "Buyer desk" },
          { label: "Size guide" },
        ]}
        title="Every shoe size, in your market's numbers."
        text={`US, EU, UK and foot length for each line, with how many pairs of each size come in one ${PACK}-pair case.`}
        aside={<SizeTrio />}
      />

      <div className="grid gap-[clamp(40px,6vw,72px)]">
        {LINES.map((line) => {
          const rows = sizeTable(line);
          return (
            <section key={line} aria-labelledby={`h-${line}`}>
              <SectionHead id={`h-${line}`} title={`${LINE_LABEL[line]}.`} sub={sizeRange(line)} className="mb-5! md:mb-6!" />
              {/* scrolls sideways only on the narrowest phones; focusable so keyboard users can scroll it too */}
              <div tabIndex={0} role="region" aria-label={`${LINE_LABEL[line]} size table`} className="overflow-x-auto rounded-card bg-tile">
                <table className="w-full min-w-[340px] text-left text-[15px] tabular-nums [&_:is(th,td)]:max-sm:px-3">
                  <caption className="sr-only">{LINE_LABEL[line]} sizes in US, EU, UK and centimetres, with pairs per case</caption>
                  <thead>
                    <tr className="border-b border-line text-[13px] text-muted">
                      {["US", "EU", "UK", "Foot", "Per case"].map((h) => (
                        <th key={h} scope="col" className="px-5 py-3.5 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.us} className="border-b border-line last:border-0">
                        <th scope="row" className="px-5 py-3 font-semibold">
                          {r.us}
                        </th>
                        <td className="px-5 py-3">{r.eu}</td>
                        <td className="px-5 py-3">{r.uk}</td>
                        <td className="px-5 py-3">{r.cm} cm</td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-2.5">
                            <span className="flex gap-0.5 max-sm:hidden" aria-hidden="true">
                              {Array.from({ length: r.pairs }, (_, i) => (
                                <span key={i} className="size-2.5 rounded-full bg-brand" />
                              ))}
                            </span>
                            {r.pairs}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <section aria-labelledby="h-fit" className="mt-sec grid gap-6 rounded-shell bg-sky p-[clamp(24px,5vw,56px)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <h2 id="h-fit" className="type-section">
            Check the fit <em>in your hands.</em>
          </h2>
          <p className="mt-3 max-w-[56ch] text-[17px] text-ink-2">
            Conversions differ a little between brands. Order a sample in your best-selling size first, and from 1,000 pairs a style we can set a case
            ratio for your market.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OpenInquiryButton note="Sample request: one pair in our best-selling size to check fit." className="btn btn-dark">
            Request a fit sample <Icon name="arrow" />
          </OpenInquiryButton>
          <Link href="/catalog" className="btn btn-line">
            Browse styles
          </Link>
        </div>
      </section>
    </>
  );
}
