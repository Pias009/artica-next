import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TechGrid } from "@/components/home/TechGrid";
import { Icon, type IconName } from "@/components/Icon";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { VersionPicker } from "@/components/product/VersionPicker";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/Reveal";
import { categoryOf, getProduct, MOQ_PAIRS, PACK, products, related } from "@/lib/products";
import { TECH } from "@/lib/tech";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProduct((await params).slug);
  if (!p) return {};
  return {
    title: `Chime Long ${p.name} · ${p.type}`,
    description: `${p.desc}. Wholesale from ${MOQ_PAIRS} pairs, ${PACK} pairs per case, ${p.sizes}.`,
    openGraph: { images: [p.outer.src] },
  };
}

const ASSURANCE: [IconName, string, string][] = [
  ["truck", "Ships to US & Canada", "DDP, FOB or EXW"],
  ["sample", "Samples in 10 days", "Before your bulk order"],
  ["shield", "Every batch inspected", "Photo report included"],
];

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();

  const shots = [
    { src: p.outer.src, alt: p.desc, label: "Outer view" },
    ...(p.zip ? [{ src: p.zip.src, alt: `${p.name}, zip side view`, label: "Zip side view" }] : []),
  ];
  // Always-on specs plus the ones that match this style's tags.
  const specs = TECH.filter((t) => !t.tag || p.tags.includes(t.tag));

  return (
    <>
      <nav aria-label="Breadcrumb" className="mt-8 mb-6 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/catalog?line=${p.line}`} className="capitalize hover:text-ink">{p.line}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/catalog?line=${p.line}&q=${encodeURIComponent(categoryOf(p))}`} className="hover:text-ink">{categoryOf(p)}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="font-medium text-ink">Chime Long {p.name}</span>
      </nav>

      <div className="grid gap-[clamp(20px,3vw,40px)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ProductGallery
          shots={shots}
          badge={<Badge badge={p.badge} className="absolute top-4 left-4 z-[2]" />}
        />

        <Reveal className="flex flex-col gap-5 md:py-4">
          <div data-reveal>
            <h1 className="text-[clamp(36px,4.4vw,56px)] leading-[1.02] font-semibold tracking-[-0.04em]">Chime Long {p.name}</h1>
            <p className="mt-2 text-[18px] text-ink-2">
              {p.type} · <span className="capitalize">{p.line}</span>
            </p>
            <p className="mt-4 max-w-[46ch] text-[16px] text-ink-2">{p.desc}.</p>
          </div>

          <div data-reveal>
            <VersionPicker id={p.id} />
          </div>

          <dl data-reveal className="grid grid-cols-3 gap-2">
            {[
              ["MOQ", `${MOQ_PAIRS} pairs`],
              ["Pack", `${PACK} / case`],
              ["Sizes", p.sizes],
            ].map(([k, v]) => (
              <div key={k} className="rounded-ph bg-tile px-4 py-3">
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <div data-reveal>
            <h2 className="mb-2.5 text-[15px] font-semibold">Size run</h2>
            <ul className="flex flex-wrap gap-1.5">
              {p.sizeRun.map((s) => (
                <li key={s} className="grid h-10 min-w-11 place-items-center rounded-full border border-ink/12 px-3 text-[14px] font-medium tabular-nums">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal>
            <BuyBox id={p.id} />
          </div>

          <ul data-reveal className="grid gap-2 text-[13.5px] text-ink-2">
            {p.materials.map((m) => (
              <li key={m.label} className="flex items-center gap-2.5">
                <Icon name={m.icon} className="size-4 text-accent" />
                <span>
                  <span className="text-muted">{m.label}:</span> {m.value}
                </span>
              </li>
            ))}
          </ul>

          <div data-reveal className="grid gap-2 border-t border-line pt-4 sm:grid-cols-3">
            {ASSURANCE.map(([icon, title, sub]) => (
              <div key={title} className="flex items-start gap-2.5">
                <Icon name={icon} className="mt-0.5 size-5 stroke-[1.4] text-ink-2" />
                <span>
                  <b className="block text-[12.5px] font-bold">{title}</b>
                  <span className="block text-[11.5px] text-muted">{sub}</span>
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <TechGrid id="specs" items={specs} title="Performance specs" />

      <Reveal as="section" aria-labelledby="h-related" className="mt-[clamp(28px,4vw,44px)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="h-related" className="h-sec">You may also stock</h2>
          <Link href="/catalog" className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-ink">
            Full catalog <Icon name="arrow" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3.5 min-[26rem]:grid-cols-2 lg:grid-cols-4">
          {related(p).map((r) => (
            <div key={r.id} data-reveal>
              <ProductCard p={r} sizes="(max-width: 864px) 50vw, 300px" className="h-full" />
            </div>
          ))}
        </div>
      </Reveal>
    </>
  );
}
