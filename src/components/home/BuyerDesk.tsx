import clsx from "clsx";
import { Txt } from "../ui/Txt";
import { DataCatalog, SectionImage } from "../ui/SectionData";
import Link from "next/link";
import { Icon, type IconName } from "../Icon";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { CONTAINERS, MARKET_COUNTRIES, MARKETS, SIZE_CHART } from "@/lib/buyer-desk";

const men9 = SIZE_CHART.men.find((r) => r.us === "9")!;
const hc = CONTAINERS[CONTAINERS.length - 1];

/** A card's picture: a photo filling the frame, a cutout boot on the card ground, or the dotted world map. */
type DeskImage = { src: string; fit: "cover" | "contain" | "map" };

/** A card's key in the admin panel: its page, e.g. "size-guide". */
const slug = (href: string) => href.replace(/^\//, "");

/** Each buyer-desk page with the one fact that sells it, so the home page carries the main point of every page. */
export const DESK: { href: string; icon: IconName; title: string; fact: string; text: string; cta: string; image: DeskImage }[] = [
  {
    href: "/size-guide",
    icon: "rows",
    image: { src: "/images/workshop-boot-men.webp", fit: "contain" },
    title: "Size guide",
    fact: `US ${men9.us} = EU ${men9.eu} = UK ${men9.uk}`,
    text: "Every size in US, EU, UK and centimetres, with the pairs of each size in a case.",
    cta: "See all sizes",
  },
  {
    href: "/container-planner",
    icon: "box",
    image: { src: "/images/workshop-boxes.webp", fit: "cover" },
    title: "Container planner",
    fact: `${hc.cases} cases fill a ${hc.name}`,
    text: "Turn cases into pairs, pallets and containers, and see how much room is left.",
    cta: "Plan a load",
  },
  {
    href: "/ship-to",
    icon: "truck",
    image: { src: "/images/world-dots.svg", fit: "map" },
    title: "Ships to your country",
    fact: `${MARKET_COUNTRIES.length} countries, ${MARKETS.length} trade lanes`,
    text: "Port, transit time, trade terms and what your import needs, country by country.",
    cta: "Check your country",
  },
  {
    href: "/quality",
    icon: "shield",
    image: { src: "/images/p04-men-leather-winter-lace-up-zip-view.webp", fit: "contain" },
    title: "Quality and documents",
    fact: "Every batch inspected",
    text: "How each pair is checked, and the test reports you can ask for.",
    cta: "How we check",
  },
  {
    href: "/verify",
    icon: "lock",
    image: { src: "/images/hero-gallery-bg.jpg", fit: "cover" },
    title: "Verify us",
    fact: "We never change bank details by email",
    text: "Check who you're paying before the first deposit.",
    cta: "Ways to verify",
  },
  {
    href: "/meet",
    icon: "camera",
    image: { src: "/images/hero-trio-showcase.jpg", fit: "cover" },
    title: "Meet us",
    fact: "Factory tours on a video call",
    text: "Walk the line live, or visit us in Guangzhou.",
    cta: "Book a call",
  },
];

/** The buyer desk: tools to plan the order and ways to check the supplier, one card each, every card a page. */
export function BuyerDesk({ heading = true }: { heading?: boolean }) {
  return (
    <section id="buyer-desk" aria-labelledby={heading ? "h-desk" : undefined} aria-label={heading ? undefined : "Buyer desk"} className={heading ? "mt-sec scroll-mt-24" : undefined}>
      {heading && (
        <SectionHead
          id="h-desk"
          eyebrow="Buyer desk"
          title={
            <>
              Plan the order, <em>check the supplier.</em>
            </>
          }
          sub="Answers to what every buyer asks a new factory, before you send a single email."
          right={
            <Link href="/buyer-desk">
              <ArrowLink><Txt k="link" label="Link on the right">Open the buyer desk</Txt></ArrowLink>
            </Link>
          }
        />
      )}
      <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {DESK.map((d) => (
          <li key={d.href}>
            <Link href={d.href} data-deco="card" className="group flex h-full flex-col overflow-hidden rounded-card bg-tile transition-colors hover:bg-chip-hover">
              <span className={clsx("relative block aspect-[16/10] overflow-hidden", d.image.fit === "cover" ? "bg-photo" : "bg-frost/70")}>
                <SectionImage
                  k={slug(d.href)}
                  src={d.image.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className={clsx(
                    "transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none",
                    d.image.fit === "cover" && "object-cover",
                    d.image.fit === "contain" && "object-contain p-[10%] drop-shadow-boot",
                    d.image.fit === "map" && "object-contain p-[6%] opacity-70",
                  )}
                />
              </span>
              <span className="flex flex-1 flex-col p-6">
                <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                  <Icon name={d.icon} className="size-5! stroke-[1.5] text-brand" />
                  <Txt k={`${slug(d.href)}.name`} label={`${d.title}: title`}>{d.title}</Txt>
                </span>
                <Txt k={`${slug(d.href)}.fact`} label={`${d.title}: big line`} className="mt-6 font-headline text-[clamp(22px,2.2vw,28px)] leading-[1.15] font-semibold tracking-[-0.02em]">{d.fact}</Txt>
                <Txt k={`${slug(d.href)}.text`} label={`${d.title}: text`} className="mt-2 text-[15px] text-ink-2">{d.text}</Txt>
                <span className="mt-auto pt-6">
                  <ArrowLink><Txt k={`${slug(d.href)}.link`} label={`${d.title}: link`}>{d.cta}</Txt></ArrowLink>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <DataCatalog items={DESK.filter((d) => d.image.fit !== "map").map((d) => ({ k: slug(d.href), label: `${d.title}: photo`, kind: "image" as const, value: d.image.src }))} />
    </section>
  );
}
